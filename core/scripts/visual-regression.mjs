#!/usr/bin/env node
/**
 * Runs the visual regression suite inside the pinned Playwright container.
 *
 * Screenshots are only comparable when the renderer AND the fonts match.
 * This app loads Ubuntu from Google Fonts, so a macOS dev box (no Ubuntu
 * installed, webfont often not fetched) renders text in Helvetica while a
 * Linux CI runner renders something else entirely — different metrics,
 * different text wrapping, page heights off by tens to hundreds of pixels.
 * That produced 3-20% pixel diffs against a 2% tolerance: not anti-aliasing
 * noise, actual reflow.
 *
 * Pinning the container means baselines generated locally and baselines
 * verified on CI come from one font set and one browser build. The image tag
 * MUST track the installed @playwright/test version — a mismatch reintroduces
 * exactly the drift this exists to remove. `playwright-image-pin.test.ts`
 * asserts that, against the fork's CI workflow.
 *
 * Usage:
 *   pnpm vr                    # verify against committed baselines
 *   pnpm vr --update-snapshots # regenerate them
 */
import { spawn, spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import net from 'node:net'
import fs from 'node:fs'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// A fork embeds this project at core/website/; ddd-core standalone has it at
// website/. Resolve by looking, so one script serves both.
const websiteDir = [path.join(repoRoot, 'core', 'website'), path.join(repoRoot, 'website')].find((dir) =>
    fs.existsSync(path.join(dir, 'playwright.config.ts')),
)
if (!websiteDir) {
    console.error('[vr] Could not find the website project (looked in core/website/ and website/).')
    process.exit(1)
}
/** Same path, expressed inside the container, which mounts repoRoot at /w. */
const containerWorkdir = `/w/${path.relative(repoRoot, websiteDir)}`
// 3802: its own port, distinct from `pnpm start` (3800) and the a11y suite
// (3801), so all three can run at once and none can attach to another's
// server. Reusing a stranger's dev server used to be possible here and meant
// screenshotting the developer's live Sessionize data instead of fixtures.
const PORT = Number(process.env.E2E_PORT ?? 3802)

// Pin the image to the installed Playwright version so the browser build and
// the client library can't drift apart.
const playwrightVersion = require(path.join(websiteDir, 'node_modules', '@playwright', 'test', 'package.json')).version
const IMAGE = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`

function run(cmd, args, opts = {}) {
    return spawnSync(cmd, args, { stdio: 'inherit', ...opts })
}

function portOpen(port) {
    return new Promise((resolve) => {
        const socket = net.connect({ port, host: '127.0.0.1' })
        socket.on('connect', () => { socket.destroy(); resolve(true) })
        socket.on('error', () => resolve(false))
        socket.setTimeout(500, () => { socket.destroy(); resolve(false) })
    })
}

async function waitForPort(port, timeoutMs) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
        if (await portOpen(port)) return true
        await new Promise((r) => setTimeout(r, 500))
    }
    return false
}

if (run('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
    console.error('Docker is not running. Start Docker/OrbStack and retry.\n' +
        'The visual suite is containerised deliberately — see the comment at the top of this file.')
    process.exit(1)
}

console.log(`[vr] image: ${IMAGE}`)
if (run('docker', ['image', 'inspect', IMAGE], { stdio: 'ignore' }).status !== 0) {
    console.log('[vr] pulling image (first run only)...')
    if (run('docker', ['pull', IMAGE]).status !== 0) process.exit(1)
}

// Always start our own isolated dev server; never reuse whatever happens to
// be listening. The container reaches it via host.docker.internal.
let server
function stopServer() {
    if (!server) return
    // Negative pid = the whole detached process group (pnpm + vite child).
    try { process.kill(-server.pid, 'SIGTERM') } catch { /* already exited */ }
    server = undefined
}

if (await portOpen(PORT)) {
    console.error(`[vr] something is already listening on :${PORT}.`)
    console.error('[vr] The visual suite needs its own isolated server (fixtures, e2e wrangler config),\n' +
        '     so it will not reuse an existing one. Stop it, or set E2E_PORT to a free port.')
    process.exit(1)
}

console.log(`[vr] starting isolated dev server on :${PORT}...`)
// Via start-dev-server.mjs, not `pnpm vite`: that wrapper points Sessionize at
// the committed fixtures and selects the e2e wrangler config, so baselines are
// captured from fixture data rather than whatever is in the developer's
// .dev.vars. Without it, screenshots vary with live Sessionize content.
//
// `--host` binds beyond loopback so the container can reach it, and
// host.docker.internal must be allow-listed explicitly: Vite rejects unknown
// Host headers with a 403 error page, and Playwright would happily screenshot
// *that* — producing baselines that agree with each other and with nothing
// real.
server = spawn('node', ['e2e/start-dev-server.mjs', '--host'], {
    cwd: websiteDir,
    stdio: 'ignore',
    detached: true,
    env: { ...process.env, E2E_PORT: String(PORT), VITE_EXTRA_ALLOWED_HOSTS: 'host.docker.internal' },
})
if (!(await waitForPort(PORT, 120_000))) {
    console.error('[vr] dev server did not start within 120s — run `node <website>/e2e/start-dev-server.mjs` to see why')
    stopServer()
    process.exit(1)
}

// Verify the container can actually reach the site *and* get real HTML back.
// A dev server that didn't pick up the allowed-hosts setting answers
// host.docker.internal with a 403 "Blocked request" page, which Playwright
// would screenshot as if it were the site.
const probe = spawnSync('docker', [
    'run', '--rm', '--add-host', 'host.docker.internal:host-gateway', IMAGE,
    'bash', '-c', `curl -s -o /dev/null -w '%{http_code}' http://host.docker.internal:${PORT}/`,
], { encoding: 'utf8' })

const status = (probe.stdout ?? '').trim()
if (status !== '200') {
    console.error(`[vr] container got HTTP ${status || '(no response)'} from the dev server, expected 200.`)
    if (status === '403') {
        console.error('[vr] That is Vite blocking the host.docker.internal Host header —\n' +
            '     VITE_EXTRA_ALLOWED_HOSTS did not reach the dev server.')
    }
    stopServer()
    process.exit(1)
}

const passthrough = process.argv.slice(2)
const result = run('docker', [
    'run', '--rm',
    '-v', `${repoRoot}:/w`,
    '-w', containerWorkdir,
    '-e', 'HOME=/tmp',
    '-e', `E2E_BASE_URL=http://host.docker.internal:${PORT}`,
    '--add-host', 'host.docker.internal:host-gateway',
    IMAGE,
    'node_modules/.bin/playwright', 'test', 'e2e/visual.spec.ts', ...passthrough,
])

stopServer()
process.exit(result.status ?? 1)
