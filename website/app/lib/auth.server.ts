import type { AppLoadContext } from 'react-router'
import { redirect } from 'react-router'
import type { AppServices } from './services/app-services'
import type { User } from './session-types'
import { isAdminHandle } from './config.server'

export type { User } from './session-types'

export function isAdmin(user: User | null): boolean {
    if (!user) return false
    return isAdminHandle(user.login)
}

export async function requireAdmin(request: Request, context: AppLoadContext): Promise<User> {
    const session = await context.services.sessions.auth.getSession(request.headers.get('cookie'))
    const user = session.get('user')

    if (!user) {
        throw redirect('/auth/login')
    }

    if (!isAdmin(user)) {
        throw new Response('Forbidden', { status: 403 })
    }

    return user
}

export async function getUser(requestHeaders: Headers, services: AppServices): Promise<User | null> {
    const session = await services.sessions.auth.getSession(requestHeaders.get('cookie'))
    return session.get('user') as User | null
}

export async function createUserSession(
    requestHeaders: Headers,
    services: AppServices,
    user: User,
    redirectTo: string,
) {
    const session = await services.sessions.auth.getSession(requestHeaders.get('cookie'))
    session.set('user', user)
    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await services.sessions.auth.commitSession(session),
        },
    })
}

export async function logout(requestHeaders: Headers, services: AppServices, redirectTo = '/') {
    const session = await services.sessions.auth.getSession(requestHeaders.get('cookie'))
    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await services.sessions.auth.commitSession(session),
        },
    })
}
