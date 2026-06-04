/**
 * Platform-agnostic application configuration. Built once per request from
 * the host environment (in Cloudflare's case, from `CloudflareEnv`).
 *
 * Core code (lib/, routes/) reads from this — never from `env` directly —
 * so that a fork can swap the host platform by writing a new builder.
 */
export interface AppConfig {
    webUrl: string
    sessionSecret: string

    /**
     * When true, every page outside `/auth/*` requires a logged-in session.
     * Used to gate the entire staging site; production leaves this off and
     * only `/admin/*` is gated.
     */
    websiteAuthRequired: boolean

    auth: {
        /** From-address for outgoing magic-link emails, e.g. "DDD Perth <noreply@dddperth.com>". */
        emailFrom: string
        /** Resend API key. When absent, magic-link emails are logged to the console (dev fallback). */
        resendApiKey?: string
    }

    /**
     * Per-year Sessionize endpoint overrides. Looked up by year string,
     * e.g. `sessionizeOverrides['2026']`.
     */
    sessionizeOverrides: Record<
        string,
        {
            sessionsEndpoint?: string
            allSessionsEndpoint?: string
        }
    >

    tito: {
        securityToken?: string
        apiToken?: string
    }

    jira: {
        /** Service-account email for Jira Basic auth. Absent → sync is disabled. */
        apiEmail?: string
        apiToken?: string
        /** API base override for scoped tokens (api.atlassian.com gateway). */
        apiBaseUrl?: string
        /** Gates flipping the Jira completion checkbox so staging/dev can't touch real issues. */
        writebackEnabled: boolean
        /** Use the fixture Jira client instead of the real API (local dev). */
        stub: boolean
        /** Per-env JQL override — scopes test envs to "portal-test"-labelled issues. */
        syncJqlOverride?: string
        /** Token expiry (epoch millis) — drives committee reminder emails. */
        tokenExpiresAt?: number
    }
}
