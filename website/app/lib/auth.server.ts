import { redirect, type RouterContext } from 'react-router'
import { getServices } from '~/remix-app-load-context'
import type { AppServices } from './services/app-services'
import type { SpeakerRecord } from './services/speakers-store'
import type { SponsorRecord } from './services/sponsors-store'
import type { User } from './session-types'

export type { User } from './session-types'

/**
 * Resolves the current user from the auth cookie + D1 session lookup.
 * Returns null when there is no session or the session has expired.
 */
export async function getUser(requestHeaders: Headers, services: AppServices): Promise<User | null> {
    const session = await services.sessions.auth.getSession(requestHeaders.get('cookie'))
    const sessionId = session.get('sessionId')
    if (!sessionId) return null

    const user = await services.auth.getSessionUser(sessionId)
    if (!user) return null

    // Slide expiry forward; cheap because the helper short-circuits unless
    // last_seen_at is older than the touch interval.
    await services.auth.touchSession(sessionId)
    return user
}

/**
 * Loader/action helper. Throws a redirect to /auth/login (preserving the
 * intended destination) when there is no session.
 *
 * A session proves the email could log in at issue time (admin allowlist or
 * sponsor contact) — it says nothing about *which* role. Gate with
 * `requireAdmin` / `requireSponsorContact` rather than this directly.
 */
export async function requireUser(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<User> {
    const user = await getUser(request.headers, getServices(context))
    if (user) return user

    const url = new URL(request.url)
    const redirectTo = url.pathname + url.search
    const params = new URLSearchParams({ redirectTo })
    throw redirect(`/auth/login?${params.toString()}`)
}

/** True when the logged-in user is on the admin allowlist. Re-checked per
 * request so removing an allowlist row revokes admin immediately. */
export async function isAdminUser(user: User | null, services: AppServices): Promise<boolean> {
    if (!user) return false
    return services.auth.isAdminEmail(user.email)
}

/**
 * Where a logged-in user belongs when they've hit the wrong area — checked
 * in priority order (admin, then sponsor, then speaker). Shared by every
 * `require*` gate below so a speaker who ends up at /admin or /portal lands
 * on /speaker-portal instead of a confusing 404, and vice versa. Returns
 * null only for the (normally unreachable, since `isAllowed` gates login)
 * case where the session belongs to none of the three roles.
 */
async function findHomeArea(email: string, services: AppServices): Promise<'/admin' | '/portal' | '/speaker-portal' | null> {
    if (await services.auth.isAdminEmail(email)) return '/admin'
    if (await services.sponsors.isSponsorContact(email)) return '/portal'
    if (await services.speakers.isSpeakerContact(email)) return '/speaker-portal'
    return null
}

/**
 * Gate for /admin/*: logged in AND on the admin allowlist. Logged-in
 * non-admins (sponsor/speaker contacts) are sent to their own portal instead.
 */
export async function requireAdmin(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<User> {
    const user = await requireUser(request, context)
    const services = getServices(context)
    if (await services.auth.isAdminEmail(user.email)) return user
    throw redirect((await findHomeArea(user.email, services)) ?? '/portal')
}

/**
 * Gate for /portal/*: logged in AND a contact of an active sponsor. The
 * email → sponsor link is re-resolved on every request, so a contact removed
 * in Jira loses access on the next sync even with a live session. Admins
 * without a sponsorship go to /admin; speakers without one go to
 * /speaker-portal; anyone else gets a 404.
 */
export async function requireSponsorContact(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<{ user: User; sponsor: SponsorRecord }> {
    const user = await requireUser(request, context)
    const services = getServices(context)

    const sponsor = await services.sponsors.getSponsorForEmail(user.email)
    if (sponsor) return { user, sponsor }

    if (await services.auth.isAdminEmail(user.email)) throw redirect('/admin')
    if (await services.speakers.isSpeakerContact(user.email)) throw redirect('/speaker-portal')
    throw new Response('Not Found', { status: 404 })
}

/**
 * Gate for /speaker-portal/*: logged in AND a contact of an active speaker.
 * The email → speaker link is re-resolved on every request, same as
 * requireSponsorContact. Admins without a speaker record go to /admin;
 * sponsors without one go to /portal; anyone else gets a 404.
 */
export async function requireSpeaker(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<{ user: User; speaker: SpeakerRecord }> {
    const user = await requireUser(request, context)
    const services = getServices(context)

    const speaker = await services.speakers.getSpeakerForEmail(user.email)
    if (speaker) return { user, speaker }

    if (await services.auth.isAdminEmail(user.email)) throw redirect('/admin')
    if (await services.sponsors.isSponsorContact(user.email)) throw redirect('/portal')
    throw new Response('Not Found', { status: 404 })
}

export async function createUserSession(
    requestHeaders: Headers,
    services: AppServices,
    user: User,
    redirectTo: string,
): Promise<Response> {
    const userAgent = requestHeaders.get('user-agent')
    const created = await services.auth.createSession({ email: user.email, userAgent })

    // Build a *fresh* session (don't read the existing cookie). Prevents
    // session fixation and stops any stray keys from a pre-login session
    // payload from carrying over after sign-in.
    const session = await services.sessions.auth.getSession(null)
    session.set('sessionId', created.id)

    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await services.sessions.auth.commitSession(session, {
                expires: new Date(created.expiresAt * 1000),
            }),
        },
    })
}

export async function logout(requestHeaders: Headers, services: AppServices, redirectTo = '/'): Promise<Response> {
    const session = await services.sessions.auth.getSession(requestHeaders.get('cookie'))
    const sessionId = session.get('sessionId')
    if (sessionId) {
        await services.auth.destroySession(sessionId)
    }

    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await services.sessions.auth.destroySession(session),
        },
    })
}
