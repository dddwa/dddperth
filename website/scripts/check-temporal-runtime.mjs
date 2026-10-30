import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'
import { build } from 'esbuild'
import { chromium, firefox, webkit } from '@playwright/test'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'

const websiteRoot = path.resolve(import.meta.dirname, '..')
const require = createRequire(path.join(websiteRoot, 'package.json'))
const wranglerRequire = createRequire(require.resolve('wrangler/package.json'))
const { Miniflare } = wranglerRequire('miniflare')
const temporalModule = path.join(websiteRoot, 'app/lib/dates/temporal.ts')
const sample = `
import { conferenceDate, conferenceTime, initializeTemporal, Temporal } from ${JSON.stringify(temporalModule)}
export { initializeTemporal }
export function snapshot() {
    const day = conferenceDate('2026-10-03')
    const event = conferenceTime('2026-10-03T09:00+08:00')
    const start = conferenceTime('2026-10-04T00:00', { timeZone: 'Australia/Sydney' })
    let rejectsGap = false
    try { conferenceTime('2026-10-04T02:30', { timeZone: 'Australia/Sydney' }) }
    catch { rejectsGap = true }
    return {
        day: day.toString(), weekday: day.dayOfWeek,
        instant: event.toInstant().toString(),
        zone: event.timeZoneId,
        dateLabel: event.toLocaleString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        timeLabel: event.toLocaleString('en-AU', { hour: 'numeric', minute: '2-digit' }),
        slotLabel: Temporal.PlainTime.from('09:30').toLocaleString('en-AU', { hour: 'numeric', minute: '2-digit' }),
        dayHours: start.until(start.add({ days: 1 }), { largestUnit: 'hours' }).hours,
        rejectsGap,
    }
}`
const entries = {
    'probe:sample': sample,
    'probe:worker': `import { snapshot, initializeTemporal } from 'probe:sample'
        export default { async fetch() { await initializeTemporal(); return Response.json(snapshot()) } }`,
    'probe:client': `import { snapshot, initializeTemporal } from 'probe:sample'
        import { createElement } from 'react'
        import { hydrateRoot } from 'react-dom/client'
        export async function hydrate() {
            await initializeTemporal()
            const errors = []
            hydrateRoot(document.getElementById('root'), createElement('output', { id: 'snapshot' }, JSON.stringify(snapshot())), {
                onRecoverableError: (error) => errors.push(error.message),
            })
            await new Promise((resolve) => setTimeout(resolve, 100))
            return { text: document.getElementById('snapshot').textContent, errors }
        }`,
}

// ES2020 rejects top-level await; ESM splitting preserves conditional imports.
// The previous single IIFE bundled the fallback into every runtime's payload.
const directory = await mkdtemp(path.join(tmpdir(), 'temporal-runtime-'))
try {
    const result = await build({
        entryPoints: { probe: 'probe:sample', client: 'probe:client', worker: 'probe:worker' },
        bundle: true, splitting: true, minify: true, format: 'esm', metafile: true,
        outdir: directory, outExtension: { '.js': '.mjs' },
        platform: 'browser', target: 'es2020', tsconfig: path.join(websiteRoot, 'tsconfig.json'),
        plugins: [{
            name: 'runtime-probes',
            setup(builder) {
                builder.onResolve({ filter: /^probe:/ }, ({ path }) => ({ path, namespace: 'probe' }))
                builder.onLoad({ filter: /.*/, namespace: 'probe' }, ({ path }) => ({
                    contents: entries[path], loader: 'ts', resolveDir: websiteRoot,
                }))
            },
        }],
    })
    const files = new Map(await Promise.all(Object.keys(result.metafile.outputs).map(async (file) =>
        ['/' + path.relative(directory, path.resolve(file)), await readFile(file, 'utf8')],
    )))
    const fallbackFiles = new Set(Object.entries(result.metafile.outputs)
        .filter(([, output]) => Object.keys(output.inputs).some((file) => file.includes('/temporal-polyfill/')))
        .map(([file]) => '/' + path.relative(directory, path.resolve(file))))
    assert.ok(fallbackFiles.size, 'The fallback must exist as a separate output chunk')
    function staticFiles(file, seen = new Set()) {
        if (seen.has(file)) return seen
        seen.add(file)
        for (const imported of result.metafile.outputs[file].imports) {
            if (imported.kind === 'import-statement' && !imported.external) staticFiles(imported.path, seen)
        }
        return seen
    }
    const probeOutput = Object.keys(result.metafile.outputs).find((file) => file.endsWith('/probe.mjs'))
    const nativeFiles = [...staticFiles(probeOutput)].map((file) => '/' + path.relative(directory, path.resolve(file)))
    assert.ok(nativeFiles.every((file) => !fallbackFiles.has(file)), 'Native entry must not statically import the fallback')
    const sizes = (paths) => ({
        minifiedBytes: paths.reduce((sum, file) => sum + Buffer.byteLength(files.get(file)), 0),
        gzipBytes: paths.reduce((sum, file) => sum + gzipSync(files.get(file)).byteLength, 0),
    })
    console.log(JSON.stringify({ temporal: { native: sizes(nativeFiles), fallback: sizes([...fallbackFiles]) } }))

    assert.ok(globalThis.Temporal, 'Run the native comparison with Node 26+')
    const nodeSnapshot = async (forceFallback) => {
        const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
            ${forceFallback ? "Object.defineProperty(globalThis, 'Temporal', { value: undefined, configurable: true });" : ''}
            const { snapshot, initializeTemporal } = await import(${JSON.stringify(pathToFileURL(path.join(directory, 'probe.mjs')).href)});
            const first = initializeTemporal();
            const second = initializeTemporal();
            if (${forceFallback} && first !== second) throw new Error('Concurrent startup must share one initialization');
            await first;
            process.stdout.write(JSON.stringify({ result: snapshot(), hasGlobal: typeof globalThis.Temporal !== 'undefined' }));
        `])
        return JSON.parse(stdout)
    }
    const { result: expected } = await nodeSnapshot(false)
    const fallback = await nodeSnapshot(true)
    assert.deepEqual(fallback.result, expected)
    assert.equal(expected.dayHours, 23)
    assert.equal(expected.rejectsGap, true)
    assert.equal(fallback.hasGlobal, false, 'The fallback must not install globals')
    console.log('Node native and forced polyfill agree')

    const worker = new Miniflare({
        compatibilityDate: '2026-06-24', modulesRoot: directory,
        modules: ['/worker.mjs', ...[...files.keys()].filter((file) => file !== '/worker.mjs')]
            .map((file) => ({ type: 'ESModule', path: path.join(directory, file), contents: files.get(file) })),
    })
    try {
        const response = await worker.dispatchFetch('http://localhost/')
        assert.deepEqual(await response.json(), expected)
        console.log('Workers runtime agrees')
    } finally { await worker.dispose() }

    const serverHTML = renderToString(createElement('output', { id: 'snapshot' }, JSON.stringify(expected)))
    const server = createServer((request, response) => {
        const pathname = new URL(request.url, 'http://localhost').pathname
        if (pathname === '/') {
            response.setHeader('Content-Type', 'text/html')
            response.end(`<div id="root">${serverHTML}</div>`)
        } else if (files.has(pathname)) {
            response.setHeader('Content-Type', 'text/javascript')
            response.end(files.get(pathname))
        } else { response.writeHead(404); response.end() }
    })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    try {
        const url = `http://127.0.0.1:${server.address().port}`
        for (const [name, browserType] of Object.entries({ chromium, firefox, webkit })) {
            const browser = await browserType.launch()
            try {
                for (const forceFallback of [false, true]) {
                    const page = await browser.newPage({ timezoneId: 'America/Los_Angeles' })
                    const requests = []
                    const errors = []
                    page.on('request', (request) => requests.push(new URL(request.url()).pathname))
                    page.on('pageerror', (error) => errors.push(error.message))
                    if (forceFallback) {
                        await page.addInitScript(() => Object.defineProperty(globalThis, 'Temporal', { value: undefined, configurable: true }))
                    }
                    await page.goto(url)
                    const hasNative = await page.evaluate(() => typeof globalThis.Temporal !== 'undefined')
                    const actual = await page.evaluate(async () => (await import('/client.mjs')).hydrate())
                    assert.deepEqual(JSON.parse(actual.text), expected)
                    assert.deepEqual(actual.errors, [])
                    assert.deepEqual(errors, [])
                    assert.equal(requests.some((file) => fallbackFiles.has(file)), !hasNative,
                        `${name}: fallback chunk should only be requested when Temporal is missing`)
                    if (forceFallback) assert.equal(await page.evaluate(() => typeof globalThis.Temporal), 'undefined')
                    await page.close()
                    console.log(`${name}: SSR hydration agrees; ${hasNative ? 'zero fallback requests' : 'fallback loaded on demand'}`)
                }
            } finally { await browser.close() }
        }
    } finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) }
} finally { await rm(directory, { recursive: true, force: true }) }
