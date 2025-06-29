import { PassThrough } from 'node:stream'

import type { TableClient, TableServiceClient } from '@azure/data-tables'
import type { BlobServiceClient } from '@azure/storage-blob'
import { createReadableStreamFromReadable } from '@react-router/node'
import type express from 'express'
import * as isbotModule from 'isbot'
import { renderToPipeableStream } from 'react-dom/server'
import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { conferenceConfig } from './config/conference-config.server'
import { getCurrentConferenceState } from './lib/conference-state.server'
import { AdminDateTimeProvider } from './lib/dates/admin-date-time-provider.server'

const ABORT_DELAY = 5_000

export async function getLoadContext({
    request,
    blobServiceClient,
    tableServiceClient,
    tableClient,
}: {
    request: express.Request
    blobServiceClient: BlobServiceClient
    tableServiceClient: TableServiceClient
    tableClient: TableClient
}): Promise<AppLoadContext> {
    const dateTimeProvider = await AdminDateTimeProvider.create(createRemixHeaders(request.headers))

    return {
        dateTimeProvider,
        blobServiceClient,
        tableServiceClient,
        tableClient,
        conferenceState: getCurrentConferenceState(dateTimeProvider, conferenceConfig),
    }
}

export default function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,

    _loadContext: AppLoadContext,
) {
    return isBotRequest(request.headers.get('user-agent'))
        ? handleBotRequest(request, responseStatusCode, responseHeaders, reactRouterContext)
        : handleBrowserRequest(request, responseStatusCode, responseHeaders, reactRouterContext)
}

function isBotRequest(userAgent: string | null) {
    if (!userAgent) {
        return false
    }

    return isbotModule.isbot(userAgent)
}

function handleBotRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false
        const { pipe, abort } = renderToPipeableStream(
            <ServerRouter context={reactRouterContext} url={request.url} />,
            {
                onAllReady() {
                    shellRendered = true
                    const body = new PassThrough()
                    const stream = createReadableStreamFromReadable(body)

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            },
        )

        setTimeout(abort, ABORT_DELAY)
    })
}

function handleBrowserRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
) {
    return new Promise((resolve, reject) => {
        let shellRendered = false
        const { pipe, abort } = renderToPipeableStream(
            <ServerRouter context={reactRouterContext} url={request.url} />,
            {
                onShellReady() {
                    shellRendered = true
                    const body = new PassThrough()
                    const stream = createReadableStreamFromReadable(body)

                    responseHeaders.set('Content-Type', 'text/html')

                    resolve(
                        new Response(stream, {
                            headers: responseHeaders,
                            status: responseStatusCode,
                        }),
                    )

                    pipe(body)
                },
                onShellError(error: unknown) {
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
                    reject(error)
                },
                onError(error: unknown) {
                    responseStatusCode = 500
                    // Log streaming rendering errors from inside the shell.  Don't log
                    // errors encountered during initial shell rendering since they'll
                    // reject and get logged in handleDocumentRequest.
                    if (shellRendered) {
                        console.error(error)
                    }
                },
            },
        )

        setTimeout(abort, ABORT_DELAY)
    })
}

export function createRemixHeaders(requestHeaders: express.Request['headers']): Headers {
    let headers = new Headers()

    for (let [key, values] of Object.entries(requestHeaders)) {
        if (values) {
            if (Array.isArray(values)) {
                for (let value of values) {
                    headers.append(key, value)
                }
            } else {
                headers.set(key, values)
            }
        }
    }

    return headers
}
