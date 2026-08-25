// This file avoids using ~ aliases so it can be imported by vite.config.js
import { RouterContextProvider } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { getCurrentConferenceState } from './lib/conference-state.server'
import { AdminDateTimeProvider } from './lib/dates/admin-date-time-provider.server'
import { DevDateTimeProvider } from './lib/dates/dev-date-time-provider.server'
import { buildAppConfigFromEnv } from './lib/services/cloudflare/build-config.server'
import { buildCloudflareServices } from './lib/services/cloudflare/build-services.server'
import {
    conferenceStateContext,
    configContext,
    dateTimeProviderContext,
    executionContext,
    servicesContext,
    type CloudflareEnv,
} from './remix-app-load-context'

export async function getLoadContext({
    request,
    env,
    ctx,
}: {
    request: Request
    env: CloudflareEnv
    ctx: ExecutionContext
}): Promise<RouterContextProvider> {
    const config = buildAppConfigFromEnv(env)
    const services = buildCloudflareServices(config, env)

    // Date override via an unsigned cookie, so the e2e suites can move "now"
    // into the voting/CFP/agenda windows without a D1 allowlist row and a
    // magic-link login.
    //
    // Two guards, and both matter:
    //
    // 1. `import.meta.env.DEV` is statically replaced with `false` at build
    //    time, so this branch — and the DevDateTimeProvider import above —
    //    are removed by dead-code elimination in any production build.
    //    Verified by `app/lib/dates/dev-date-override.test.ts`, which greps
    //    the built worker for the cookie name. Keep this statically
    //    evaluable: a runtime `env` lookup would ship the seam.
    //
    // 2. `E2E_DATE_OVERRIDE` is set only by `e2e/start-dev-server.mjs`. Without
    //    it, ordinary `pnpm start` ignores the cookie entirely. This exists
    //    because the override deliberately outranks nothing — it *replaces*
    //    the admin provider below, so a stale cookie left over from a test run
    //    would otherwise silently break the admin date override in the UI,
    //    with no clue as to why.
    //
    // Note the ordering is intentional: checking the cookie first avoids the
    // auth + D1 round-trip that `AdminDateTimeProvider.create` performs on
    // every request. That's also why this is gated rather than reordered.
    const devDateTimeProvider =
        import.meta.env.DEV && env.E2E_DATE_OVERRIDE === 'true'
            ? DevDateTimeProvider.fromRequest(request.headers)
            : null

    const dateTimeProvider = devDateTimeProvider ?? (await AdminDateTimeProvider.create(request.headers, services))

    const context = new RouterContextProvider()
    context.set(configContext, config)
    context.set(servicesContext, services)
    context.set(dateTimeProviderContext, dateTimeProvider)
    context.set(conferenceStateContext, getCurrentConferenceState(dateTimeProvider, conferenceManifest.conferences))
    context.set(executionContext, ctx)

    return context
}
