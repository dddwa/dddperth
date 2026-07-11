import { redirect, type RouterContext } from 'react-router'
import { getServices } from '~/remix-app-load-context'
import type { AppServices } from './services/app-services'
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
 * Anyone with a session is, by definition, allowlisted — the allowlist is
 * checked at magic-link issue time. There is no separate admin role.
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

/** Backwards-compatible alias. The "admin" gate is just "logged in" now. */
export const requireAdmin = requireUser

/** Backwards-compatible alias for the old isAdmin check. */
export function isAdmin(user: User | null): boolean {
    return user !== null
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
