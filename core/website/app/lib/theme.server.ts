/**
 * Theme cookie + resolver
 *
 * The colour-scheme preference is a non-secret UI flag, so we store it as a
 * plain `light`/`dark` literal (not the base64-JSON wrapper that
 * `createCookie` would emit). That lets the pre-paint inline script in
 * `root.tsx` decode it with `document.cookie.match(/\b__theme=(light|dark)\b/)`
 * — no base64, no decodeURIComponent juggling.
 *
 * Server reads via `readThemeCookie(request)`. Server writes (the toggle's
 * /api/theme POST) via the `THEME_COOKIE_*` helpers below.
 *
 * Default when no cookie is set: dark, matching the historical site behaviour.
 */

export type Theme = 'dark' | 'light'
export const THEMES: readonly Theme[] = ['dark', 'light'] as const
export const DEFAULT_THEME: Theme = 'dark'

export const THEME_COOKIE_NAME = '__theme'

/** One year in seconds. */
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

function isTheme(value: unknown): value is Theme {
    return value === 'dark' || value === 'light'
}

/** Pull the plain `light`/`dark` value out of a Cookie header. */
export function readThemeCookie(request: Request): Theme {
    const header = request.headers.get('Cookie')
    if (!header) return DEFAULT_THEME
    // Match `__theme=light` or `__theme=dark` anywhere in the header.
    const match = header.match(/(?:^|;\s*)__theme=(light|dark)\b/)
    return match && isTheme(match[1]) ? match[1] : DEFAULT_THEME
}

/**
 * Build the Set-Cookie header value. Non-httpOnly so the client toggle can
 * also write it; non-Secure because dev runs over http://localhost. We do not
 * sign it: it is a UI preference, not an auth token.
 */
export function writeThemeCookie(theme: Theme): string {
    return [
        `${THEME_COOKIE_NAME}=${theme}`,
        'Path=/',
        'SameSite=Lax',
        `Max-Age=${THEME_COOKIE_MAX_AGE}`,
    ].join('; ')
}
