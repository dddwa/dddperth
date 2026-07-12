import type { User } from '../session-types'

/**
 * Magic-link authentication surface. The Cloudflare implementation backs
 * tokens, sessions and the email allowlist with D1, and sends mail via
 * Resend (or logs to the console when no API key is configured).
 *
 * Forks targeting a different platform implement this interface against
 * their own storage and email provider.
 */
export interface AuthService {
    /**
     * True when `email` may log in (case-insensitive): either on the admin
     * allowlist or a contact of an active sponsor. Checked at magic-link
     * issue time — what the login grants access to is decided per request
     * by `requireAdmin` / `requireSponsorContact`.
     */
    isAllowed(email: string): Promise<boolean>

    /** True when `email` is on the admin allowlist. The strict admin gate. */
    isAdminEmail(email: string): Promise<boolean>

    /**
     * Issues a one-time login token and emails the magic link. The raw token
     * lives only in the email; D1 stores its SHA-256. Always resolves —
     * callers should respond identically whether or not the email was sent
     * (so attackers can't probe the allowlist).
     */
    sendMagicLink(args: { email: string; redirectTo: string; requestUrl: string }): Promise<void>

    /**
     * Consumes a token: verifies it exists, hasn't expired, hasn't been used,
     * marks it used, and returns the email + redirect target. Returns null
     * for any failure (invalid, expired, already consumed). Single call —
     * the row is updated atomically.
     */
    consumeMagicLink(rawToken: string): Promise<{ email: string; redirectTo: string | null } | null>

    /**
     * Creates a server-side session for `email` and returns its opaque id.
     * The id is what gets stored in the cookie.
     */
    createSession(args: { email: string; userAgent: string | null }): Promise<{ id: string; expiresAt: number }>

    /** Returns the user behind a session id, or null if the session is missing/expired. */
    getSessionUser(sessionId: string): Promise<User | null>

    /** Refreshes `last_seen_at` and slides the expiry forward. Best-effort; ignores missing sessions. */
    touchSession(sessionId: string): Promise<void>

    /** Deletes the session row. Idempotent. */
    destroySession(sessionId: string): Promise<void>
}
