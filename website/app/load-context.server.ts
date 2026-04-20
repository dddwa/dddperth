// This file avoids using ~ aliases so it can be imported by vite.config.js
import type { AppLoadContext } from 'react-router'
import { conferenceConfig } from './config/conference-config.server'
import { getCurrentConferenceState } from './lib/conference-state.server'
import { AdminDateTimeProvider } from './lib/dates/admin-date-time-provider.server'
import type { CloudflareEnv } from './remix-app-load-context'

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
