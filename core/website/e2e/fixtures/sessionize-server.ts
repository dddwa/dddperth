import { readFileSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * A tiny HTTP server that serves the committed Sessionize fixtures.
 *
 * Why not MSW: every Sessionize call happens inside the Cloudflare Worker
 * (`app/lib/sessionize.server.ts`, reached via loaders and
 * `/api/voting/batch`), not in the browser. MSW's service worker only sees
 * browser-originated requests, and its Node interceptors can't be installed
 * inside workerd — so neither half of MSW can reach these fetches.
 *
 * The worker installs a dev-only `fetch` interceptor
 * (`app/lib/sessionize-fixture-fetch.server.ts`) that rewrites any
 * `sessionize.com` request to this server. That is host-based, so it covers
 * every year and every view at once.
 *
 * It deliberately replaced the earlier approach of repointing the app's
 * per-year `SESSIONIZE_<YYYY>_*` endpoint overrides. That seam exists, but
 * only 2026 leaves its endpoints `undefined` for env injection — every other
 * year hardcodes its Sessionize URL in `conference/config/years/<year>.ts`,
 * so there was no override to set and those requests silently reached the
 * live API.
 *
 * Sessionize's URL shape is `<endpoint>/view/<View>`, so one server answers
 * `/view/GridSmart` (agenda), `/view/Sessions` (voting) and `/view/Speakers`
 * (talk detail).
 */

const fixturesDir = dirname(fileURLToPath(import.meta.url))

const VIEWS: Record<string, string> = {
    GridSmart: 'sessionize/grid-smart.json',
    Sessions: 'sessionize/all-sessions.json',
    // The talk detail template resolves speaker names, bios and photos from
    // this view. Without it, that page fell back to the live API.
    Speakers: 'sessionize/speakers.json',
}

export interface SessionizeFixtureServer {
    url: string
    close: () => Promise<void>
}

/**
 * Fixed port, because the fixture URL is passed to the worker as a Worker var
 * written to the e2e `.dev.vars` before the dev server boots (the Cloudflare
 * Vite plugin reads that file at boot and does not read `process.env` —
 * verified). A fixed port keeps that file stable.
 */
export const SESSIONIZE_FIXTURE_PORT = Number(process.env.SESSIONIZE_FIXTURE_PORT ?? 3899)

export async function startSessionizeFixtureServer(
    port = SESSIONIZE_FIXTURE_PORT,
): Promise<SessionizeFixtureServer> {
    const payloads = new Map<string, string>(
        Object.entries(VIEWS).map(([view, file]) => [view, readFileSync(join(fixturesDir, file), 'utf8')]),
    )

    const server: Server = createServer((req, res) => {
        const view = /\/view\/([A-Za-z]+)/.exec(req.url ?? '')?.[1]
        if (process.env.SESSIONIZE_FIXTURE_DEBUG) console.log(`[fixture-server] ${req.method} ${req.url}`)
        const body = view ? payloads.get(view) : undefined

        if (!body) {
            res.writeHead(404, { 'content-type': 'application/json' })
            res.end(JSON.stringify({ error: `No fixture for ${req.url}`, available: Object.keys(VIEWS) }))
            return
        }

        res.writeHead(200, {
            'content-type': 'application/json',
            // The app caches Sessionize responses in-process; make it
            // explicit that these are not to be cached anywhere else.
            'cache-control': 'no-store',
        })
        res.end(body)
    })

    await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

    const address = server.address()
    if (typeof address === 'string' || address === null) {
        throw new Error('Sessionize fixture server did not bind to a TCP port')
    }

    return {
        url: `http://127.0.0.1:${address.port}`,
        close: () =>
            new Promise<void>((resolve, reject) => {
                server.close((err) => (err ? reject(err) : resolve()))
            }),
    }
}
