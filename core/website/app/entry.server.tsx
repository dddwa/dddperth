import * as isbotModule from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import type { EntryContext, RouterContextProvider } from 'react-router'
import { ServerRouter } from 'react-router'

export { getLoadContext } from './load-context.server'

const ABORT_DELAY = 5_000

export default async function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
    _loadContext: RouterContextProvider,
) {
    const isBot = isBotRequest(request.headers.get('user-agent'))

    let status = responseStatusCode
    const stream = await renderToReadableStream(<ServerRouter context={reactRouterContext} url={request.url} />, {
        signal: AbortSignal.timeout(ABORT_DELAY),
        onError(error: unknown) {
            status = 500
            console.error(error)
        },
    })

    if (isBot) {
        await stream.allReady
    }

    responseHeaders.set('Content-Type', 'text/html')

    return new Response(stream, {
        headers: responseHeaders,
        status,
    })
}

function isBotRequest(userAgent: string | null) {
    if (!userAgent) {
        return false
    }

    return isbotModule.isbot(userAgent)
}
