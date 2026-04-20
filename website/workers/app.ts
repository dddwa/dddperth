import { createRequestHandler } from 'react-router'
import type { CloudflareEnv } from '../app/remix-app-load-context'
import { getLoadContext } from '../app/entry.server'

const requestHandler = createRequestHandler(
    () => import('virtual:react-router/server-build'),
    import.meta.env.MODE,
)

export default {
    async fetch(request: Request, env: CloudflareEnv, ctx: ExecutionContext): Promise<Response> {
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
} satisfies ExportedHandler<CloudflareEnv>
