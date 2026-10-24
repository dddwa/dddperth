import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'
import vm from 'node:vm'
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
import { conferenceDate, conferenceTime, Temporal } from ${JSON.stringify(temporalModule)}
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
async function bundle(contents, globalName = 'TemporalProbe') {
    const result = await build({
        stdin: { contents, resolveDir: websiteRoot, loader: 'ts' },
        bundle: true, write: false, minify: true, format: 'iife', globalName,
        platform: 'browser', target: 'es2022', tsconfig: path.join(websiteRoot, 'tsconfig.json'),
    })
    return result.outputFiles[0].text
}
const code = await bundle(sample)
const sizes = (source) => ({ minifiedBytes: Buffer.byteLength(source), gzipBytes: gzipSync(source).byteLength })
console.log(JSON.stringify({ temporal: sizes(code) }))

assert.ok(globalThis.Temporal, 'Run the native comparison with Node 26+')
const native = vm.createContext({ Temporal: globalThis.Temporal, Intl })
const fallback = vm.createContext({ Temporal: undefined, Intl })
vm.runInContext(code, native)
vm.runInContext(code, fallback)
// Serialize across realms exactly as loader data crosses SSR/client runtimes.
const expected = JSON.parse(JSON.stringify(native.TemporalProbe.snapshot()))
assert.deepEqual(JSON.parse(JSON.stringify(fallback.TemporalProbe.snapshot())), expected)
assert.equal(expected.dayHours, 23)
assert.equal(expected.rejectsGap, true)
assert.equal(fallback.Temporal, undefined, 'The ponyfill must not install globals')
console.log('Node native and forced polyfill agree')

const options = {
    modules: true, compatibilityDate: '2026-06-24',
    script: `${code}\nexport default { fetch() { return Response.json(TemporalProbe.snapshot()) } }`,
}
const worker = new Miniflare(options)
try {
    const response = await worker.dispatchFetch('http://localhost/')
    assert.deepEqual(await response.json(), expected)
    console.log('Workers runtime agrees')
} finally { await worker.dispose() }

const serverHTML = renderToString(createElement('output', { id: 'snapshot' }, JSON.stringify(expected)))
const client = await bundle(`${sample}
import { createElement } from 'react'
import { hydrateRoot } from 'react-dom/client'
export async function hydrate() {
    const errors = []
    hydrateRoot(document.getElementById('root'), createElement('output', { id: 'snapshot' }, JSON.stringify(snapshot())), {
        onRecoverableError: (error) => errors.push(error.message),
    })
    await new Promise((resolve) => setTimeout(resolve, 100))
    return { text: document.getElementById('snapshot').textContent, errors }
}`, 'ClientProbe')
for (const [name, browserType] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await browserType.launch()
    try {
        for (const forceFallback of [false, true]) {
            const page = await browser.newPage({ timezoneId: 'America/Los_Angeles' })
            await page.goto('about:blank')
            await page.setContent(`<div id="root">${serverHTML}</div>`)
            if (forceFallback) {
                await page.evaluate(() => Object.defineProperty(globalThis, 'Temporal', { value: undefined, configurable: true }))
                assert.equal(await page.evaluate(() => typeof globalThis.Temporal), 'undefined')
            }
            await page.addScriptTag({ content: client })
            const result = await page.evaluate(() => globalThis.ClientProbe.hydrate())
            assert.deepEqual(JSON.parse(result.text), expected)
            assert.deepEqual(result.errors, [])
            await page.close()
            console.log(`${name}: SSR hydration agrees (${forceFallback ? 'forced polyfill' : 'native when available'})`)
        }
    } finally { await browser.close() }
}
