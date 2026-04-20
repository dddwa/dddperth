import * as isbotModule from 'isbot'
import { renderToReadableStream } from 'react-dom/server'
import type { AppLoadContext, EntryContext } from 'react-router'
import { ServerRouter } from 'react-router'
import { conferenceConfig } from './config/conference-config.server'
import { getCurrentConferenceState } from './lib/conference-state.server'
import { AdminDateTimeProvider } from './lib/dates/admin-date-time-provider.server'
import type { CloudflareEnv } from './remix-app-load-context'

const ABORT_DELAY = 5_000

export async function getLoadContext({
    request,
    env,
    ctx,
}: {
    request: Request
    env: CloudflareEnv
    ctx: ExecutionContext
}): Promise<AppLoadContext> {
    const dateTimeProvider = await AdminDateTimeProvider.create(request.headers)

    return {
        cloudflare: { env, ctx },
        dateTimeProvider,
        db: env.DB,
        conferenceState: getCurrentConferenceState(dateTimeProvider, conferenceConfig),
    }
}

export default async function handleRequest(
    request: Request,
    responseStatusCode: number,
    responseHeaders: Headers,
    reactRouterContext: EntryContext,
    _loadContext: AppLoadContext,
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
