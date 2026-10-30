/**
 * The shortlist browser-id cookie.
 *
 * Shortlist counts need *some* stable handle per browser, or a single person
 * holding down the button inflates a talk without limit. There is no attendee
 * login to hang that off (magic links only reach allowlisted admins, sponsors
 * and speakers), so the handle is a random id in a cookie and nothing more.
 *
 * What it deliberately is not:
 *
 * - **Not an identity.** The id is `crypto.randomUUID()`, generated server-side
 *   on first pick. It maps to no email, no account, no session; it is never
 *   rendered, logged against a person, or joined to any other table.
 * - **Not signed.** Forging one buys an attacker a second vote, which they
 *   could equally get by clearing the cookie. Signing would imply a
 *   trustworthiness the number does not have — see the note in
 *   `0025_agenda_shortlist.sql`.
 * - **Not client-readable.** `httpOnly`, because nothing in the browser needs
 *   it: a person's own picks live in localStorage, and this exists only so the
 *   server can deduplicate.
 *
 * It is the weakest dedupe that is better than nothing, and the count should be
 * read in that spirit.
 */

export const SHORTLIST_COOKIE_NAME = '__shortlist'

/** One year: longer than a conference cycle, so a returning visitor is not recounted. */
const SHORTLIST_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** A v4 uuid, as `crypto.randomUUID()` emits. Anything else is ignored. */
const BROWSER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/**
 * Read the browser id from a Cookie header, or `undefined` when absent or
 * malformed.
 *
 * Validating the shape matters: the id goes straight into a primary key, and
 * an unbounded attacker-supplied string would let one client write arbitrarily
 * many distinct rows per talk. A uuid still lets them forge *a* value, but it
 * bounds what a single malformed request can do.
 */
export function readShortlistBrowserId(request: Request): string | undefined {
    const header = request.headers.get('Cookie')
    if (!header) return undefined

    const match = header.match(/(?:^|;\s*)__shortlist=([^;]+)/)
    if (!match) return undefined

    const value = decodeURIComponent(match[1]).toLowerCase()
    return BROWSER_ID_PATTERN.test(value) ? value : undefined
}

/** A fresh browser id for a client that has not shortlisted anything yet. */
export function newShortlistBrowserId(): string {
    return crypto.randomUUID()
}

/**
 * Build the Set-Cookie header value.
 *
 * `httpOnly` and `Secure`; `SameSite=Lax` so it survives a normal navigation
 * back to the agenda. Dev runs over http://localhost, where `Secure` cookies
 * are still accepted by browsers for localhost specifically.
 */
export function writeShortlistCookie(browserId: string): string {
    return [
        `${SHORTLIST_COOKIE_NAME}=${browserId}`,
        'Path=/',
        'SameSite=Lax',
        'HttpOnly',
        'Secure',
        `Max-Age=${SHORTLIST_COOKIE_MAX_AGE}`,
    ].join('; ')
}
