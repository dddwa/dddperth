import 'react-router'
import type { ConferenceState } from './lib/conference-state-client-safe'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'
import type { AppConfig } from './lib/services/app-config'
import type { AppServices } from './lib/services/app-services'

/**
 * Cloudflare-specific environment bindings. Only consumed by the Cloudflare
 * service builders and the worker entry — application code should read from
 * `context.config` and `context.services` instead.
 */
export interface CloudflareEnv {
    DB: D1Database

    SESSION_SECRET: string
    WEB_URL: string

    /** "true" turns on the staging-wide auth gate. Anything else leaves only `/admin` gated. */
    WEBSITE_AUTH_REQUIRED?: string
    /** Resend API key. Optional locally — if absent, magic links are logged to the console. */
    RESEND_API_KEY?: string
    /** From-address for outgoing magic-link emails. */
    AUTH_EMAIL_FROM?: string

    TITO_SECURITY_TOKEN?: string
    TITO_API_TOKEN?: string

    SESSIONIZE_2026_SESSIONS: string
    SESSIONIZE_2026_ALL_SESSIONS?: string
}

declare module 'react-router' {
    export interface AppLoadContext {
        config: AppConfig
        services: AppServices
        conferenceState: ConferenceState
        dateTimeProvider: DateTimeProvider
    }
}
