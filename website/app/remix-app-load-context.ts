import 'react-router'
import type { ConferenceState } from './lib/conference-state-client-safe'
import type { DateTimeProvider } from './lib/dates/date-time-provider.server'

// Cloudflare bindings type
export interface CloudflareEnv {
    DB: D1Database

    // Environment variables (secrets)
    SESSION_SECRET: string
    WEB_URL: string

    // GitHub OAuth (admin login flow in app/lib/auth.server.ts)
    WEBSITE_GITHUB_APP_CLIENT_ID: string
    WEBSITE_GITHUB_APP_CLIENT_SECRET: string

    // GitHub repo pointers — used to build "Edit on GitHub" links for MDX pages
    GITHUB_ORGANIZATION: string
    GITHUB_REPO: string
    GITHUB_REF?: string

    // External API keys
    TITO_SECURITY_TOKEN?: string

    // Sessionize endpoints
    SESSIONIZE_2026_SESSIONS: string
    SESSIONIZE_2026_ALL_SESSIONS?: string
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
