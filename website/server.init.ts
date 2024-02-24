import { trace } from '@opentelemetry/api'
import { createRequestHandler } from '@remix-run/express'
import type { ServerBuild } from '@remix-run/node'
import { installGlobals } from '@remix-run/node'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import express from 'express'
import { resolveError } from './app/lib/resolve-error.js'

const tracer = trace.getTracerProvider().getTracer('server')

export function init() {
    tracer.startActiveSpan('start', async (span) => {
        installGlobals()

        try {
            process.on('uncaughtException', (err: Error) => {
                span.recordException(err)
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            process.on('unhandledRejection', (err) => {
                span.recordException(resolveError(err))
            })

            span.addEvent('start', { mode: process.env.NODE_ENV })
            const port = process.env.PORT || 3000

            const viteDevServer =
                process.env.NODE_ENV === 'production'
                    ? undefined
                    : await import('vite').then((vite) =>
                          vite.createServer({
                              server: { middlewareMode: true },
                          }),
                      )

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const resolveBuild: ServerBuild | (() => Promise<ServerBuild>) =
                viteDevServer
                    ? () =>
                          viteDevServer.ssrLoadModule(
                              'virtual:remix/server-build',
                          )
                    : // @ts-expect-error - this will not exist at build time
                      // eslint-disable-next-line import/no-unresolved
                      await import('./server/index.js')
            const initialBuild =
                typeof resolveBuild === 'function'
                    ? await resolveBuild()
                    : resolveBuild

            const app = express()

            app.use((req, res, next) => {
                // helpful headers:
                if (process.env.AZURE_REGION) {
                    res.set('x-azure-region', process.env.AZURE_REGION)
                }
                res.set(
                    'Strict-Transport-Security',
                    `max-age=${60 * 60 * 24 * 365 * 100}`,
                )

                // /clean-urls/ -> /clean-urls
                if (req.path.endsWith('/') && req.path.length > 1) {
                    const query = req.url.slice(req.path.length)
                    const safepath = req.path.slice(0, -1).replace(/\/+/g, '/')
                    res.redirect(301, safepath + query)
                    return
                }
                next()
            })

                .use(compression())
                // http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
                .disable('x-powered-by')

            // Remix fingerprints its assets so we can cache forever.
            if (viteDevServer) {
                app.use(viteDevServer.middlewares)
            } else {
                app.use(
                    '/assets',
                    express.static('client/assets', {
                        immutable: true,
                        maxAge: '1y',
                    }),
                )
            }
            app.use(express.static('client', { maxAge: '1h' }))

            app.all(
                '*',
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                createRequestHandler({
                    build: resolveBuild,
                    mode: initialBuild.mode,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    getLoadContext: (_req) => {
                        return initialBuild.entry.module.getLoadContext()
                    },
                }),
            )

            const server = app.listen(port, () => {
                console.log(`✅ Ready: http://localhost:${port}`)
            })

            closeWithGrace(async ({ err }) => {
                if (err) {
                    tracer.startActiveSpan('closeWithGrace', (span) => {
                        span.recordException(resolveError(err))

                        span.end()
                    })
                }

                await new Promise((resolve, reject) => {
                    server.close((e) =>
                        e ? reject(e) : resolve('Closed gracefully'),
                    )
                })
            })
        } catch (error) {
            span.recordException(resolveError(error))
        } finally {
            span.end()
        }
    })
}
