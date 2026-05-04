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

    github: {
        organization: string
        repo: string
        ref: string
        oauth?: {
            clientId: string
            clientSecret: string
        }
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
    }
}
