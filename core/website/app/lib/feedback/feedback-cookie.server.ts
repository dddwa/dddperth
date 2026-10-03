/**
 * The feedback browser-id cookie. Same idea, and the same caveats, as the
 * agenda shortlist's (`agenda-shortlist-cookie.server.ts`): a random id with
 * no identity behind it, so a resubmission from the same browser replaces the
 * earlier response instead of counting twice. A separate cookie because the
 * two serve unrelated features and shouldn't share a lifetime.
 */

const FEEDBACK_COOKIE_NAME = '__feedback'

/** One year: outlives the feedback window, which is all it needs to. */
const FEEDBACK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const BROWSER_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

/** The browser id, or `undefined` when absent or not a v4 uuid (it goes into a unique key). */
export function readFeedbackBrowserId(request: Request): string | undefined {
    const match = request.headers.get('Cookie')?.match(/(?:^|;\s*)__feedback=([^;]+)/)
    if (!match) return undefined
    const value = decodeURIComponent(match[1]).toLowerCase()
    return BROWSER_ID_PATTERN.test(value) ? value : undefined
}

export function writeFeedbackCookie(browserId: string): string {
    return [
        `${FEEDBACK_COOKIE_NAME}=${browserId}`,
        'Path=/feedback',
        'SameSite=Lax',
        'HttpOnly',
        'Secure',
        `Max-Age=${FEEDBACK_COOKIE_MAX_AGE}`,
    ].join('; ')
}
