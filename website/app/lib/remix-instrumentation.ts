/* eslint-disable @typescript-eslint/no-explicit-any */
import opentelemetry, { Span, SpanStatusCode } from '@opentelemetry/api'
import {
    InstrumentationBase,
    InstrumentationConfig,
    InstrumentationNodeModuleDefinition,
    InstrumentationNodeModuleFile,
    isWrapped,
} from '@opentelemetry/instrumentation'
import { SemanticAttributes } from '@opentelemetry/semantic-conventions'
import { Params } from '@remix-run/react'
import { UNSAFE_DeferredData } from '@remix-run/router'

import type * as remixRunServerRuntime from '@remix-run/server-runtime'
import type * as remixRunServerRuntimeData from '@remix-run/server-runtime/dist/data.js'
import type * as remixRunServerRuntimeRouteMatching from '@remix-run/server-runtime/dist/routeMatching.js'
import { RouteMatch } from '@remix-run/server-runtime/dist/routeMatching.js'
import { ServerRoute } from '@remix-run/server-runtime/dist/routes'

const RemixSemanticAttributes = {
    MATCH_PARAMS: 'match.params',
    MATCH_ROUTE_ID: 'match.route.id',
}

export interface RemixInstrumentationConfig extends InstrumentationConfig {
    /**
     * Mapping of FormData field to span attribute names. Appends attribute as `formData.${name}`.
     *
     * Provide `true` value to use the FormData field name as the attribute name, or provide
     * a `string` value to map the field name to a custom attribute name.
     *
     * @default { _action: "actionType" }
     */
    actionFormDataAttributes?: Record<string, boolean | string>
    /**
     * Whether to emit errors in the form of span attributes, as well as in span exception events.
     * Defaults to `false`, meaning that only span exception events are emitted.
     */
    legacyErrorAttributes?: boolean
}

const DEFAULT_CONFIG: RemixInstrumentationConfig = {
    actionFormDataAttributes: {
        _action: 'actionType',
    },
    legacyErrorAttributes: false,
}

export class RemixInstrumentation extends InstrumentationBase {
    constructor(config: RemixInstrumentationConfig = {}) {
        super(
            'RemixInstrumentation',
            '0.0.0',
            Object.assign({}, DEFAULT_CONFIG, config),
        )
    }

    override getConfig(): RemixInstrumentationConfig {
        return this._config
    }

    override setConfig(config: RemixInstrumentationConfig = {}) {
        this._config = Object.assign({}, DEFAULT_CONFIG, config)
    }

    protected init() {
        console.log('init')
        const remixRunServerRuntimeRouteMatchingFile =
            new InstrumentationNodeModuleFile<
                typeof remixRunServerRuntimeRouteMatching
            >(
                '@remix-run/server-runtime/dist/routeMatching.js',
                ['1.6.2 - 2.x'],
                (moduleExports: typeof remixRunServerRuntimeRouteMatching) => {
                    console.log('patchMatchServerRoutes')
                    // createRequestHandler
                    if (isWrapped(moduleExports['matchServerRoutes'])) {
                        this._unwrap(moduleExports, 'matchServerRoutes')
                    }
                    this._wrap(
                        moduleExports,
                        'matchServerRoutes',
                        this._patchMatchServerRoutes(),
                    )

                    return moduleExports
                },
                (moduleExports) => {
                    moduleExports &&
                        this._unwrap(moduleExports, 'matchServerRoutes')
                },
            )

        /*
         * In Remix 1.8.0, the callXXLoader functions were renamed to callXXLoaderRR.
         */
        const remixRunServerRuntimeDataFile = new InstrumentationNodeModuleFile<
            typeof remixRunServerRuntimeData
        >(
            '@remix-run/server-runtime/dist/data.js',
            ['1.8.0 - 2.x'],
            (moduleExports: typeof remixRunServerRuntimeData) => {
                // callRouteLoader
                if (isWrapped(moduleExports['callRouteLoaderRR'])) {
                    this._unwrap(moduleExports, 'callRouteLoaderRR')
                }
                this._wrap(
                    moduleExports,
                    'callRouteLoaderRR',
                    this._patchCallRouteLoader(),
                )

                // callRouteAction
                if (isWrapped(moduleExports['callRouteActionRR'])) {
                    this._unwrap(moduleExports, 'callRouteActionRR')
                }
                this._wrap(
                    moduleExports,
                    'callRouteActionRR',
                    this._patchCallRouteAction(),
                )
                return moduleExports
            },
            (moduleExports) => {
                if (!moduleExports) return
                this._unwrap(moduleExports, 'callRouteLoaderRR')
                this._unwrap(moduleExports, 'callRouteActionRR')
            },
        )

        const remixRunServerRuntimeModule =
            new InstrumentationNodeModuleDefinition<
                typeof remixRunServerRuntime
            >(
                '@remix-run/server-runtime',
                ['>=1.*'],
                (moduleExports: typeof remixRunServerRuntime) => {
                    // createRequestHandler
                    if (isWrapped(moduleExports['createRequestHandler'])) {
                        this._unwrap(moduleExports, 'createRequestHandler')
                    }
                    this._wrap(
                        moduleExports,
                        'createRequestHandler',
                        this._patchCreateRequestHandler(),
                    )

                    return moduleExports
                },
                (moduleExports: typeof remixRunServerRuntime) => {
                    this._unwrap(moduleExports, 'createRequestHandler')
                },
                [
                    remixRunServerRuntimeRouteMatchingFile,
                    remixRunServerRuntimeDataFile,
                ],
            )

        return remixRunServerRuntimeModule
    }

    private _patchMatchServerRoutes(): (
        original: typeof remixRunServerRuntimeRouteMatching.matchServerRoutes,
    ) => any {
        console.log('patchMatchServerRoutes')
        return function matchServerRoutes(original) {
            return function patchMatchServerRoutes(
                this: any,
                ...args: any
            ): RouteMatch<ServerRoute>[] | null {
                const result = original.apply(this, args)

                const span = opentelemetry.trace.getSpan(
                    opentelemetry.context.active(),
                )

                const route = (result || []).slice(-1)[0]?.route

                const routePath = route?.path
                if (span && routePath) {
                    span.setAttribute(SemanticAttributes.HTTP_ROUTE, routePath)
                    span.updateName(`remix.request ${routePath}`)
                }

                const routeId = route?.id
                if (span && routeId) {
                    span.setAttribute(
                        RemixSemanticAttributes.MATCH_ROUTE_ID,
                        routeId,
                    )
                }

                return result
            }
        }
    }

    private _patchCreateRequestHandler(): (
        original: typeof remixRunServerRuntime.createRequestHandler,
    ) => any {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const plugin = this
        return function createRequestHandler(original) {
            return function patchCreateRequestHandler(
                this: any,
                ...args: any
            ): remixRunServerRuntime.RequestHandler {
                const originalRequestHandler: remixRunServerRuntime.RequestHandler =
                    original.apply(this, args)

                return (
                    request: Request,
                    loadContext?: remixRunServerRuntime.AppLoadContext,
                ) => {
                    const span = plugin.tracer.startSpan(
                        `remix.request`,
                        {
                            attributes: {
                                [SemanticAttributes.CODE_FUNCTION]:
                                    'requestHandler',
                            },
                        },
                        opentelemetry.context.active(),
                    )
                    addRequestAttributesToSpan(span, request)

                    const originalResponsePromise = opentelemetry.context.with(
                        opentelemetry.trace.setSpan(
                            opentelemetry.context.active(),
                            span,
                        ),
                        () => originalRequestHandler(request, loadContext),
                    )
                    return originalResponsePromise
                        .then((response) => {
                            addResponseAttributesToSpan(span, response)
                            return response
                        })
                        .catch((error) => {
                            plugin.addErrorToSpan(span, error)
                            throw error
                        })
                        .finally(() => {
                            span.end()
                        })
                }
            }
        }
    }

    private _patchCallRouteLoader(): (
        original: typeof remixRunServerRuntimeData.callRouteLoaderRR,
    ) => any {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const plugin = this
        return function callRouteLoader(original) {
            return function patchCallRouteLoader(
                this: any,
                ...args: any
            ): Promise<Response | UNSAFE_DeferredData> {
                const [params] = args

                const span = plugin.tracer.startSpan(
                    `LOADER ${params.routeId}`,
                    {
                        attributes: {
                            [SemanticAttributes.CODE_FUNCTION]: 'loader',
                        },
                    },
                    opentelemetry.context.active(),
                )

                addRequestAttributesToSpan(span, params.request)
                addMatchAttributesToSpan(span, {
                    routeId: params.routeId,
                    params: params.params,
                })

                return opentelemetry.context.with(
                    opentelemetry.trace.setSpan(
                        opentelemetry.context.active(),
                        span,
                    ),
                    () => {
                        const originalResponsePromise: Promise<
                            Response | UNSAFE_DeferredData
                        > = original.apply(this, args)
                        return originalResponsePromise
                            .then((response) => {
                                addResponseAttributesToSpan(span, response)
                                return response
                            })
                            .catch((error) => {
                                plugin.addErrorToSpan(span, error)
                                throw error
                            })
                            .finally(() => {
                                span.end()
                            })
                    },
                )
            }
        }
    }

    private _patchCallRouteAction(): (
        original: typeof remixRunServerRuntimeData.callRouteActionRR,
    ) => any {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const plugin = this
        return function callRouteAction(original) {
            return async function patchCallRouteAction(
                this: any,
            ): Promise<Response> {
                // eslint-disable-next-line prefer-rest-params
                const [params] = arguments as unknown as any
                const clonedRequest = params.request.clone()
                const span = plugin.tracer.startSpan(
                    `ACTION ${params.routeId}`,
                    {
                        attributes: {
                            [SemanticAttributes.CODE_FUNCTION]: 'action',
                        },
                    },
                    opentelemetry.context.active(),
                )

                addRequestAttributesToSpan(span, clonedRequest)
                addMatchAttributesToSpan(span, {
                    routeId: params.routeId,
                    params: params.params,
                })

                return opentelemetry.context.with(
                    opentelemetry.trace.setSpan(
                        opentelemetry.context.active(),
                        span,
                    ),
                    async () => {
                        const originalResponsePromise: Promise<Response> =
                            // eslint-disable-next-line prefer-rest-params
                            original.apply(this, arguments as any)

                        return originalResponsePromise
                            .then(async (response) => {
                                addResponseAttributesToSpan(span, response)

                                try {
                                    const formData =
                                        await clonedRequest.formData()
                                    const {
                                        actionFormDataAttributes:
                                            actionFormAttributes,
                                    } = plugin.getConfig()
                                    formData.forEach((value: any, key: any) => {
                                        if (
                                            actionFormAttributes &&
                                            actionFormAttributes[key] &&
                                            actionFormAttributes[key] !== false
                                        ) {
                                            const keyName =
                                                actionFormAttributes[key] ===
                                                true
                                                    ? key
                                                    : actionFormAttributes[key]
                                            span.setAttribute(
                                                `formData.${keyName}`,
                                                value.toString(),
                                            )
                                        }
                                    })
                                } catch {
                                    // Silently continue on any error. Typically happens because the action body cannot be processed
                                    // into FormData, in which case we should just continue.
                                }

                                return response
                            })
                            .catch(async (error) => {
                                plugin.addErrorToSpan(span, error)
                                throw error
                            })
                            .finally(() => {
                                span.end()
                            })
                    },
                )
            }
        }
    }

    private addErrorToSpan(span: Span, error: Error) {
        addErrorEventToSpan(span, error)

        if (this.getConfig().legacyErrorAttributes || false) {
            addErrorAttributesToSpan(span, error)
        }
    }
}

const addRequestAttributesToSpan = (span: Span, request: Request) => {
    span.setAttributes({
        [SemanticAttributes.HTTP_METHOD]: request.method,
        [SemanticAttributes.HTTP_URL]: request.url,
    })
}

const addMatchAttributesToSpan = (
    span: Span,
    match: { routeId: string; params: Params<string> },
) => {
    span.setAttributes({
        [RemixSemanticAttributes.MATCH_ROUTE_ID]: match.routeId,
    })

    Object.keys(match.params).forEach((paramName) => {
        span.setAttribute(
            `${RemixSemanticAttributes.MATCH_PARAMS}.${paramName}`,
            match.params[paramName] || '(undefined)',
        )
    })
}

const addResponseAttributesToSpan = (
    span: Span,
    response: Response | UNSAFE_DeferredData,
) => {
    if (response instanceof Response) {
        span.setAttributes({
            [SemanticAttributes.HTTP_STATUS_CODE]: response.status,
        })
    } else {
        // TODO handle UNSAFE_DeferredData
    }
}

const addErrorEventToSpan = (span: Span, error: Error) => {
    span.recordException(error)
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message })
}

const addErrorAttributesToSpan = (span: Span, error: Error) => {
    span.setAttribute('error', true)
    if (error.message) {
        span.setAttribute(SemanticAttributes.EXCEPTION_MESSAGE, error.message)
    }
    if (error.stack) {
        span.setAttribute(SemanticAttributes.EXCEPTION_STACKTRACE, error.stack)
    }
}
