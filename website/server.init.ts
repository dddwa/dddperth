/* eslint-disable @typescript-eslint/no-base-to-string */
import { SpanStatusCode, trace } from '@opentelemetry/api'
import { createRequestHandler } from '@react-router/express'
import closeWithGrace from 'close-with-grace'
import compression from 'compression'
import express from 'express'
import path from 'node:path'
import type { ServerBuild } from 'react-router'
import { resolveError } from './app/lib/resolve-error.js'

const tracer = trace.getTracerProvider().getTracer('server')

export function init() {
    return tracer.startActiveSpan('start', async (span) => {
        console.log('Starting')
        try {
            process.on('uncaughtException', (err: Error) => {
                console.error('uncaughtException', JSON.stringify(err))
                const activeSpan = trace.getActiveSpan()
                if (activeSpan) {
                    activeSpan.recordException(resolveError(err))
                    activeSpan.setStatus({ code: SpanStatusCode.ERROR })
                } else {
                    tracer.startActiveSpan('uncaughtException', (span) => {
                        span.recordException(resolveError(err))
                        span.setStatus({ code: SpanStatusCode.ERROR })
                        span.end()
                    })
                }
            })
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            process.on('unhandledRejection', (err) => {
                console.error('unhandledRejection', JSON.stringify(err))
                const activeSpan = trace.getActiveSpan()
                if (activeSpan) {
                    activeSpan.recordException(resolveError(err))
                    activeSpan.setStatus({ code: SpanStatusCode.ERROR })
                } else {
                    tracer.startActiveSpan('uncaughtException', (span) => {
                        span.recordException(resolveError(err))
                        span.setStatus({ code: SpanStatusCode.ERROR })
                        span.end()
                    })
                }
            })

            span.addEvent('start', { mode: process.env.NODE_ENV })
            const port = process.env.PORT || 3800

            const viteDevServer =
                process.env.NODE_ENV === 'production'
                    ? undefined
                    : await import('vite').then((vite) =>
                          vite.createServer({
                              server: { middlewareMode: true },
                          }),
                      )

            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const resolveBuild: ServerBuild | (() => Promise<ServerBuild>) = viteDevServer
                ? () => viteDevServer.ssrLoadModule('virtual:react-router/server-build')
                : // @ts-expect-error - this will not exist at build time
                  await import('../remix/server/index.js')

            const initialBuild = typeof resolveBuild === 'function' ? await resolveBuild() : resolveBuild

            const app = express()

            app.use((req, res, next) => {
                // helpful headers:
                if (process.env.AZURE_REGION) {
                    res.set('x-azure-region', process.env.AZURE_REGION)
                }
                res.set('Strict-Transport-Security', `max-age=${60 * 60 * 24 * 365 * 100}`)

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
                    express.static(path.join(process.cwd(), 'remix/client/assets'), {
                        immutable: true,
                        maxAge: '1y',
                    }),
                )
            }
            app.use(express.static(path.join(process.cwd(), 'remix/client'), { maxAge: '1h' }))

            app.all(
                '*',
                createRequestHandler({
                    build: resolveBuild,
                    getLoadContext: (req) => {
                        return initialBuild.entry.module.getLoadContext({
                            query: req.query,
                        })
                    },
                }) as any,
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
                    server.close((e) => (e ? reject(e) : resolve('Closed gracefully')))
                })
            })
        } catch (error) {
            console.error('Error starting server', error)
            span.recordException(resolveError(error))
        } finally {
            span.end()
        }
    })
}
