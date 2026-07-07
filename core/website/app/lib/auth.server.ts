import { redirect, type RouterContext } from 'react-router'
import { getServices } from '~/remix-app-load-context'
import type { AppServices } from './services/app-services'
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
 * Gate for /admin/*: logged in AND on the admin allowlist. Logged-in
 * non-admins (sponsor contacts) are sent to their portal instead.
 */
export async function requireAdmin(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<User> {
    const user = await requireUser(request, context)
    if (await getServices(context).auth.isAdminEmail(user.email)) return user
    throw redirect('/portal')
}

/**
 * Gate for /portal/*: logged in AND a contact of an active sponsor. The
 * email → sponsor link is re-resolved on every request, so a contact removed
 * in Jira loses access on the next sync even with a live session. Admins
 * without a sponsorship are bounced to /admin; anyone else gets a 404.
 */
export async function requireSponsorContact(
    request: Request,
    context: { get<T>(context: RouterContext<T>): T },
): Promise<{ user: User; sponsor: SponsorRecord }> {
    const user = await requireUser(request, context)
    const services = getServices(context)

    const sponsor = await services.sponsors.getSponsorForEmail(user.email)
    if (sponsor) return { user, sponsor }

    if (await services.auth.isAdminEmail(user.email)) {
        throw redirect('/admin')
    }
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
