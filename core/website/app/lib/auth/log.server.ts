/**
 * Structured logger for the auth flow. Emits a single JSON line per event
 * so Cloudflare's observability can index by `event` (and any other field)
 * for filtering. Keep these to a handful of named events — every login
 * attempt produces a few of these and we don't want noise.
 *
 * These logs include email addresses by design: knowing *who* tried to log
 * in is the whole point of debugging deliverability or a stuck flow. The
 * Cloudflare logs are admin-only, so this is acceptable PII exposure.
 */
type AuthEvent =
    | { event: 'login.requested'; email: string; allowed: boolean }
    | { event: 'login.rate_limited'; email: string; outstanding: number }
    | { event: 'login.email_sent'; email: string; provider: 'resend' | 'console' }
    | { event: 'login.email_failed'; email: string; error: string }
    | { event: 'verify.consumed'; email: string }
    | { event: 'verify.failed'; reason: 'not_found' | 'expired' | 'already_used' }
    | { event: 'session.created'; email: string }
    | { event: 'session.destroyed' }

export function logAuthEvent(payload: AuthEvent): void {
    console.log(JSON.stringify({ scope: 'auth', ...payload }))
}
