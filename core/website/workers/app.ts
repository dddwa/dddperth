import { createRequestHandler } from 'react-router'
import type { CloudflareEnv } from '../app/remix-app-load-context'
import { getLoadContext } from '../app/entry.server'
import { buildAppConfigFromEnv } from '../app/lib/services/cloudflare/build-config.server'
import { buildCloudflareServices } from '../app/lib/services/cloudflare/build-services.server'

const requestHandler = createRequestHandler(() => import('virtual:react-router/server-build'), import.meta.env.MODE)

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
        // Dev-only: point every Sessionize request at the committed fixtures.
        // `import.meta.env.MODE` is statically replaced with `"production"`
        // in a production build, so this and the dynamic import are removed
        // (there is a test asserting the built worker contains no trace of
        // it). `import.meta.env.DEV` folds correctly here too; `MODE` is
        // preferred only because it states the intent directly. The
        // fixture URL only exists when `e2e/start-dev-server.mjs` set it, so
        // ordinary `pnpm start` still talks to the real Sessionize.
        if (import.meta.env.MODE !== 'production') {
            const { getFixtureBaseUrl, installSessionizeFixtureFetch } =
                await import('../app/lib/sessionize-fixture-fetch.server')
            const fixtureBaseUrl = getFixtureBaseUrl(env as unknown as Record<string, unknown>)
            if (fixtureBaseUrl) installSessionizeFixtureFetch(fixtureBaseUrl)
        }

        const url = new URL(request.url)

        // Handle trailing slash redirects (match Express behavior)
        if (url.pathname.endsWith('/') && url.pathname.length > 1) {
            const safepath = url.pathname.slice(0, -1).replace(/\/+/g, '/')
            return Response.redirect(new URL(safepath + url.search, url.origin).toString(), 301)
        }

        try {
            const loadContext = await getLoadContext({ request, env, ctx })
            const response = await requestHandler(request, loadContext)

            // Clone response to add security headers
            const newHeaders = new Headers(response.headers)
            newHeaders.set('Strict-Transport-Security', `max-age=${60 * 60 * 24 * 365 * 100}`)

            // React Router's production server build prepends the default "/"
            // basename to $path()-derived redirect targets, yielding a
            // protocol-relative "//path" Location (e.g. "//agenda/2025") that
            // browsers resolve to a bogus host. The app never emits
            // protocol-relative redirects, so collapse a leading run of slashes
            // back to a single "/". (Only reproduces in the built Worker, not
            // the Vite dev server, which is why it slips past local testing.)
            const location = newHeaders.get('Location')
            if (location && location.startsWith('//')) {
                newHeaders.set('Location', '/' + location.replace(/^\/+/, ''))
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: newHeaders,
            })
        } catch (error) {
            console.error('Request handler error:', error)
            throw error
        }
    },

    // Hourly sponsor + speaker sync (see triggers.crons in the production
    // wrangler config). Sponsor sync no-ops without a manifest entry or Jira
    // secrets; speaker sync no-ops without a manifest entry or a configured
    // Sessionize endpoint for that year.
    async scheduled(_controller: ScheduledController, env: CloudflareEnv, ctx: ExecutionContext): Promise<void> {
        const config = buildAppConfigFromEnv(env)
        const services = buildCloudflareServices(config, env)

        if (services.sponsorSync.isConfigured()) {
            ctx.waitUntil(
                services.sponsorSync
                    .syncNow('cron')
                    .then(() => services.sponsorSync.retryPendingWritebacks())
                    .catch((error) => console.error('Scheduled sponsor sync failed:', error)),
            )
        } else {
            console.log('Scheduled run: sponsor sync not configured, skipping')
        }

        if (services.speakerSync.isConfigured()) {
            ctx.waitUntil(
                services.speakerSync
                    .syncNow('cron')
                    .catch((error) => console.error('Scheduled speaker sync failed:', error)),
            )
        } else {
            console.log('Scheduled run: speaker sync not configured, skipping')
        }
    },
} satisfies ExportedHandler<CloudflareEnv>
