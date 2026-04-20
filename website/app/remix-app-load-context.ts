import 'react-router'
import type { ConferenceState } from './lib/conference-state-client-safe'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'

// Cloudflare bindings type
export interface CloudflareEnv {
    DB: D1Database

    // Environment variables (secrets)
    SESSION_SECRET: string
    WEB_URL: string

    // GitHub App configuration
    WEBSITE_GITHUB_APP_ID: string
    WEBSITE_GITHUB_APP_CLIENT_ID: string
    WEBSITE_GITHUB_APP_CLIENT_SECRET: string
    WEBSITE_GITHUB_APP_PRIVATE_KEY: string
    WEBSITE_GITHUB_APP_INSTALLATION_ID: string
    GITHUB_ORGANIZATION: string
    GITHUB_REPO: string
    GITHUB_REF?: string
    USE_GITHUB_CONTENT?: string

    // External API keys
    TITO_SECURITY_TOKEN?: string
    EVENTS_AIR_CLIENT_ID?: string
    EVENTS_AIR_CLIENT_SECRET?: string
    EVENTS_AIR_TENANT_ID?: string
    EVENTS_AIR_EVENT_ID?: string

    // Sessionize endpoints
    SESSIONIZE_2025_SESSIONS: string
    SESSIONIZE_2025_ALL_SESSIONS?: string
}

declare module 'react-router' {
    export interface AppLoadContext {
        cloudflare: {
            env: CloudflareEnv
            ctx: ExecutionContext
        }
        conferenceState: ConferenceState
        dateTimeProvider: DateTimeProvider
        db: D1Database
    }
}
