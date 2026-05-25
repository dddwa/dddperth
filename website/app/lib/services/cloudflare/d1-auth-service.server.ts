import { conferenceManifest } from '@conference/manifest'
import { logAuthEvent } from '../../auth/log.server'
import type { AppConfig } from '../app-config'
import type { AuthService } from '../auth-service'
import type { EmailService } from '../email-service'
import type { User } from '../../session-types'

const conferenceName = conferenceManifest.public.name

const TOKEN_TTL_SECONDS = 15 * 60 // 15 minutes
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60 // 30 days
const SESSION_TOUCH_INTERVAL_SECONDS = 60 * 60 // refresh last_seen_at at most once an hour

/**
 * Maximum number of unconsumed, unexpired magic-link tokens we'll let exist
 * for any one email at a time. Combined with the 15-minute token TTL this
 * caps an attacker (or a misbehaving form) at 3 sends per 15-minute window.
 */
const MAX_OUTSTANDING_TOKENS_PER_EMAIL = 3

export function createD1AuthService(args: { config: AppConfig; db: D1Database; email: EmailService }): AuthService {
    const { config, db, email } = args

    return {
        async isAllowed(emailAddress) {
            const normalised = emailAddress.trim().toLowerCase()
            const row = await db
                .prepare('SELECT 1 FROM auth_allowlist WHERE email = ? LIMIT 1')
                .bind(normalised)
                .first<{ '1': number }>()
            return row !== null
        },

        async sendMagicLink({ email: emailAddress, redirectTo, requestUrl }) {
            const normalised = emailAddress.trim().toLowerCase()

            // Belt-and-braces: the route also calls isAllowed() before
            // calling us. Don't issue a token for an unallowlisted address.
            const allowed = await this.isAllowed(normalised)
            logAuthEvent({ event: 'login.requested', email: normalised, allowed })
            if (!allowed) return

            const now = Math.floor(Date.now() / 1000)

            // Per-email cap on outstanding tokens — stops a flood of magic
            // links from filling an admin's inbox. The user-facing response
            // is unchanged ("check your inbox") so the throttle isn't visible
            // to attackers; it just stops the email from going out.
            const outstanding = await db
                .prepare(
                    `SELECT COUNT(*) AS n FROM auth_login_tokens
                     WHERE email = ? AND consumed_at IS NULL AND expires_at > ?`,
                )
                .bind(normalised, now)
                .first<{ n: number }>()

            if (outstanding && outstanding.n >= MAX_OUTSTANDING_TOKENS_PER_EMAIL) {
                logAuthEvent({ event: 'login.rate_limited', email: normalised, outstanding: outstanding.n })
                return
            }

            const rawToken = generateToken()
            const tokenHash = await sha256Hex(rawToken)

            await db
                .prepare(
                    `INSERT INTO auth_login_tokens (token_hash, email, created_at, expires_at, redirect_to)
                     VALUES (?, ?, ?, ?, ?)`,
                )
                .bind(tokenHash, normalised, now, now + TOKEN_TTL_SECONDS, redirectTo)
                .run()

            const verifyUrl = new URL(`/auth/verify/${rawToken}`, config.webUrl).toString()

            try {
                await email.send({
                    to: normalised,
                    subject: `Sign in to ${conferenceName} admin`,
                    html: renderMagicLinkHtml(verifyUrl, requestUrl),
                    text: renderMagicLinkText(verifyUrl, requestUrl),
                })
                logAuthEvent({
                    event: 'login.email_sent',
                    email: normalised,
                    provider: email.canSend() ? 'resend' : 'console',
                })
            } catch (error) {
                logAuthEvent({
                    event: 'login.email_failed',
                    email: normalised,
                    error: error instanceof Error ? error.message : String(error),
                })
                throw error
            }
        },

        async consumeMagicLink(rawToken) {
            const tokenHash = await sha256Hex(rawToken)
            const now = Math.floor(Date.now() / 1000)

            // Atomic claim: only succeeds if the token is unconsumed and unexpired.
            const claimed = await db
                .prepare(
                    `UPDATE auth_login_tokens
                     SET consumed_at = ?
                     WHERE token_hash = ?
                       AND consumed_at IS NULL
                       AND expires_at > ?
                     RETURNING email, redirect_to`,
                )
                .bind(now, tokenHash, now)
                .first<{ email: string; redirect_to: string | null }>()

            if (claimed) {
                logAuthEvent({ event: 'verify.consumed', email: claimed.email })
                return { email: claimed.email, redirectTo: claimed.redirect_to }
            }

            // Distinguish between not-found / expired / already-consumed for
            // observability. This is a single follow-up read; the atomic
            // guarantee above still holds.
            const existing = await db
                .prepare(
                    `SELECT consumed_at, expires_at FROM auth_login_tokens WHERE token_hash = ?`,
                )
                .bind(tokenHash)
                .first<{ consumed_at: number | null; expires_at: number }>()

            const reason: 'not_found' | 'expired' | 'already_used' = !existing
                ? 'not_found'
                : existing.consumed_at !== null
                  ? 'already_used'
                  : 'expired'
            logAuthEvent({ event: 'verify.failed', reason })
            return null
        },

        async createSession({ email: emailAddress, userAgent }) {
            const id = generateToken()
            const now = Math.floor(Date.now() / 1000)
            const expiresAt = now + SESSION_TTL_SECONDS
            const normalised = emailAddress.toLowerCase()

            await db
                .prepare(
                    `INSERT INTO auth_sessions (id, email, created_at, expires_at, last_seen_at, user_agent)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                )
                .bind(id, normalised, now, expiresAt, now, userAgent)
                .run()

            logAuthEvent({ event: 'session.created', email: normalised })
            return { id, expiresAt }
        },

        async getSessionUser(sessionId) {
            const now = Math.floor(Date.now() / 1000)
            const row = await db
                .prepare(
                    `SELECT s.email, a.name
                     FROM auth_sessions s
                     LEFT JOIN auth_allowlist a ON a.email = s.email
                     WHERE s.id = ? AND s.expires_at > ?`,
                )
                .bind(sessionId, now)
                .first<{ email: string; name: string | null }>()

            if (!row) return null
            const user: User = { email: row.email, name: row.name }
            return user
        },

        async touchSession(sessionId) {
            const now = Math.floor(Date.now() / 1000)
            // Skip the write if last_seen_at is recent — every authenticated
            // request would otherwise hit D1 once just for this.
            await db
                .prepare(
                    `UPDATE auth_sessions
                     SET last_seen_at = ?, expires_at = ?
                     WHERE id = ? AND last_seen_at < ?`,
                )
                .bind(now, now + SESSION_TTL_SECONDS, sessionId, now - SESSION_TOUCH_INTERVAL_SECONDS)
                .run()
        },

        async destroySession(sessionId) {
            await db.prepare('DELETE FROM auth_sessions WHERE id = ?').bind(sessionId).run()
            logAuthEvent({ event: 'session.destroyed' })
        },
    }
}

function generateToken(): string {
    // 32 random bytes → base64url. crypto.getRandomValues exists in the Workers runtime.
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return base64UrlEncode(bytes)
}

async function sha256Hex(input: string): Promise<string> {
    const data = new TextEncoder().encode(input)
    const hash = await crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function base64UrlEncode(bytes: Uint8Array): string {
    let binary = ''
    for (const byte of bytes) binary += String.fromCharCode(byte)
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function renderMagicLinkHtml(verifyUrl: string, requestUrl: string): string {
    // verifyUrl is built from a server-controlled `webUrl` + a base64url
    // token, so it's safe by construction. requestUrl ultimately comes from
    // the request origin; if a misconfigured proxy ever lets the Host header
    // through unfiltered, escaping prevents that becoming an HTML injection
    // path inside the email body.
    const safeVerify = escapeHtml(verifyUrl)
    const safeRequest = escapeHtml(requestUrl)
    return `<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #111; max-width: 560px; margin: 0 auto; padding: 24px;">
  <h1 style="font-size: 20px; margin-bottom: 16px;">Sign in to ${escapeHtml(conferenceName)} admin</h1>
  <p>Click the button below to confirm your sign-in. This link expires in 15 minutes.</p>
  <p style="margin: 24px 0;">
    <a href="${safeVerify}" style="display: inline-block; background: #4338ca; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Confirm sign-in</a>
  </p>
  <p style="font-size: 13px; color: #555;">Or paste this URL into your browser:<br><span style="word-break: break-all;">${safeVerify}</span></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;">
  <p style="font-size: 12px; color: #777;">This sign-in was requested from <code>${safeRequest}</code>. If it wasn't you, ignore this email — no action is required.</p>
</body>
</html>`
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function renderMagicLinkText(verifyUrl: string, requestUrl: string): string {
    return `Sign in to ${conferenceName} admin

Click to confirm: ${verifyUrl}

This link expires in 15 minutes. If you didn't request it, ignore this email — no action is required.

Requested from: ${requestUrl}`
}
