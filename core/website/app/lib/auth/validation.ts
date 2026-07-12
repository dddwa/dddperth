/**
 * Shared validators for the auth flow. Used by both the route layer
 * (`auth.login`, `auth.verify.$token`) and the service layer so any future
 * code path that issues or consumes a token gets the same checks for free.
 */

const DEFAULT_REDIRECT = '/admin'

/**
 * Coerces `value` into a same-origin path or falls back to /admin.
 * Rejects:
 *   - null / empty
 *   - protocol-relative `//host/...`
 *   - absolute URLs `https://...`
 *   - anything that isn't a leading-slash path
 *
 * Also normalises React Router data-request URLs: a session that expires
 * during client-side navigation throws the login redirect from a
 * `<path>.data?_routes=…` fetch, and redirecting back to that literal URL
 * after sign-in renders the data endpoint as a page ("Content not found").
 * Strip the `.data` suffix and `_routes` param so the user lands on the
 * actual page.
 *
 * Called both at issue time (by the login route) and again at consume time
 * (defence in depth — the token's stored redirect_to could in theory be
 * planted by a future code path that forgets to sanitise).
 */
export function sanitiseRedirect(value: string | null | undefined): string {
    if (!value) return DEFAULT_REDIRECT
    if (!value.startsWith('/') || value.startsWith('//')) return DEFAULT_REDIRECT

    const url = new URL(value, 'http://sanitise.invalid')

    let pathname = url.pathname
    if (pathname === '/_root.data') {
        // The data URL for the root path is `/_root.data`, not `/.data`.
        pathname = '/'
    } else if (pathname.endsWith('.data')) {
        pathname = pathname.slice(0, -'.data'.length) || '/'
    }

    url.searchParams.delete('_routes')
    const search = url.searchParams.toString()
    return `${pathname}${search ? `?${search}` : ''}`
}

/**
 * Lightweight email shape check. We're not trying to be RFC 5322 compliant
 * — just rejecting obviously malformed input (whitespace, commas, multiple
 * @s, missing TLD). The allowlist is the real authority on which addresses
 * can log in.
 */
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/

export function isValidEmail(value: string): boolean {
    return EMAIL_RE.test(value)
}
