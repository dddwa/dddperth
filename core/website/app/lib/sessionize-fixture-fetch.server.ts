/**
 * Dev-only `fetch` interceptor that answers every Sessionize request from the
 * committed fixtures in `e2e/fixtures/sessionize/`.
 *
 * **This file is dead code in any production build.** Its only caller
 * (`workers/app.ts`) guards the call with `import.meta.env.DEV`, which Vite
 * statically replaces with `false` when building, so the branch, the import
 * and this module are dropped by dead-code elimination. `sessionize-fixture-
 * fetch.test.ts` greps the built worker and fails if any of it ships.
 *
 * ## Why intercept `fetch` rather than repoint the endpoint
 *
 * The app supports per-year endpoint overrides via `SESSIONIZE_<YYYY>_*` env
 * vars, and the e2e suite used to rely on them. That seam is real but partial,
 * and the gap is silent: only 2026 leaves its endpoints `undefined` in config
 * for env injection. **2021-2025 hardcode their Sessionize URLs as string
 * literals** in `conference/config/years/<year>.ts`, so for those years there
 * is no override to set and requests went straight to the live API — which is
 * how visual baselines ended up being screenshots of live production data,
 * including a real speaker's name and photograph.
 *
 * Intercepting `fetch` is host-based, so it covers every year, every view and
 * any year added later, with nothing to keep in sync. A test asserts that no
 * `sessionize.com` request escapes.
 *
 * ## Why not MSW
 *
 * MSW is the natural tool for this and would be preferable if it could run
 * here. It can't: these fetches happen inside the Cloudflare Worker (workerd),
 * where MSW's service-worker transport never sees them and its Node
 * interceptors (which patch `http`/`https`/undici) cannot be installed.
 * Patching `globalThis.fetch` is the same idea reduced to what workerd
 * supports — the call sites use bare `fetch(...)`, which resolves through the
 * global at call time.
 */
/** Sessionize's URL shape is `<endpoint>/view/<View>`. */
const VIEW_PATTERN = /\/view\/([A-Za-z]+)/

/** Only this host is redirected; everything else passes through untouched. */
const SESSIONIZE_HOSTNAME = 'sessionize.com'

let installed = false

/**
 * Points Sessionize traffic at the fixture server for the whole worker.
 *
 * Idempotent: the worker module is evaluated once per isolate, but a dev
 * server can re-evaluate it on HMR, and double-wrapping would leave the
 * original `fetch` unreachable.
 */
export function installSessionizeFixtureFetch(fixtureBaseUrl: string) {
    if (installed) return
    installed = true

    const realFetch = globalThis.fetch.bind(globalThis)

    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url

        let parsed: URL
        try {
            parsed = new URL(url)
        } catch {
            // Relative or otherwise unparseable — not a Sessionize call.
            return realFetch(input, init)
        }

        if (parsed.hostname !== SESSIONIZE_HOSTNAME) {
            return realFetch(input, init)
        }

        const view = VIEW_PATTERN.exec(parsed.pathname)?.[1]
        if (!view) {
            // A Sessionize URL we don't have a fixture shape for. Fail loudly
            // rather than falling through to the network: silently reaching the
            // real API is the exact bug this exists to prevent.
            throw new Error(
                `[sessionize-fixtures] Unmocked Sessionize request: ${url}. ` +
                    'Add a fixture for this view rather than letting the test hit the live API.',
            )
        }

        return realFetch(`${fixtureBaseUrl}/view/${view}`, init)
    }
}

/**
 * The fixture server's URL, injected as a Worker var by
 * `e2e/start-dev-server.mjs`. Absent during ordinary `pnpm start`, which is
 * what keeps local dev talking to the real Sessionize.
 */
export function getFixtureBaseUrl(env: Record<string, unknown>): string | undefined {
    const value = env.SESSIONIZE_FIXTURE_URL
    return typeof value === 'string' && value.length > 0 ? value : undefined
}

export { SESSIONIZE_HOSTNAME, VIEW_PATTERN }
