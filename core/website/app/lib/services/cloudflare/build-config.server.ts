import { conferenceManifest } from '@conference/manifest'
import type { CloudflareEnv } from '../../../remix-app-load-context'
import type { AppConfig } from '../app-config'

/**
 * Builds the platform-agnostic AppConfig from Cloudflare env bindings.
 * The only place in the app that knows about CloudflareEnv shape.
 */
export function buildAppConfigFromEnv(env: CloudflareEnv): AppConfig {
    // Fallback derives the From: from the manifest brand so a fork doesn't
    // need to set AUTH_EMAIL_FROM in wrangler vars just to look right.
    const fallbackEmailFrom = `${conferenceManifest.public.name} <${conferenceManifest.brand.noreplyEmail}>`
    return {
        webUrl: env.WEB_URL,
        sessionSecret: env.SESSION_SECRET,
        websiteAuthRequired: env.WEBSITE_AUTH_REQUIRED === 'true',
        auth: {
            emailFrom: env.AUTH_EMAIL_FROM ?? fallbackEmailFrom,
            resendApiKey: env.RESEND_API_KEY,
        },
        sessionizeOverrides: collectSessionizeOverrides(env),
        tito: {
            securityToken: env.TITO_SECURITY_TOKEN,
            apiToken: env.TITO_API_TOKEN,
        },
    }
}

/**
 * Collects per-year Sessionize endpoint overrides keyed by the 4-digit year.
 * Bindings follow the pattern `SESSIONIZE_<YYYY>_SESSIONS` /
 * `SESSIONIZE_<YYYY>_ALL_SESSIONS`.
 */
function collectSessionizeOverrides(env: CloudflareEnv): Record<string, { sessionsEndpoint?: string; allSessionsEndpoint?: string }> {
    const result: Record<string, { sessionsEndpoint?: string; allSessionsEndpoint?: string }> = {}

    for (const [key, value] of Object.entries(env as unknown as Record<string, unknown>)) {
        if (typeof value !== 'string' || value.length === 0) continue

        const sessionsMatch = /^SESSIONIZE_(\d{4})_SESSIONS$/.exec(key)
        if (sessionsMatch) {
            const year = sessionsMatch[1]
            result[year] = { ...(result[year] ?? {}), sessionsEndpoint: value }
            continue
        }

        const allMatch = /^SESSIONIZE_(\d{4})_ALL_SESSIONS$/.exec(key)
        if (allMatch) {
            const year = allMatch[1]
            result[year] = { ...(result[year] ?? {}), allSessionsEndpoint: value }
        }
    }

    return result
}
