// This file avoids using ~ aliases so it can be imported by vite.config.js
import type { AppLoadContext } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { getCurrentConferenceState } from './lib/conference-state.server'
import { AdminDateTimeProvider } from './lib/dates/admin-date-time-provider.server'
import { buildAppConfigFromEnv } from './lib/services/cloudflare/build-config.server'
import { buildCloudflareServices } from './lib/services/cloudflare/build-services.server'
import type { CloudflareEnv } from './remix-app-load-context'

export async function getLoadContext({
    request,
    env,
    ctx: _ctx,
}: {
    request: Request
    env: CloudflareEnv
    ctx: ExecutionContext
}): Promise<AppLoadContext> {
    const config = buildAppConfigFromEnv(env)
    const services = buildCloudflareServices(config, env.DB)
    const dateTimeProvider = await AdminDateTimeProvider.create(request.headers, services)

    return {
        config,
        services,
        dateTimeProvider,
        conferenceState: getCurrentConferenceState(dateTimeProvider, conferenceManifest.conferences),
    }
}
