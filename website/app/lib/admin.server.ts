import { redirect } from 'react-router'
import { getUser, isAdmin, type User } from './auth.server'

export async function requireAdminUser(request: Request): Promise<User> {
    const user = await getUser(request)

    if (!user) {
        throw redirect('/auth/login')
    }

    if (!isAdmin(user)) {
        throw new Response('Access denied. Admin privileges required.', {
            status: 403,
            statusText: 'Forbidden',
        })
    }

    return user
}

export async function getOptionalAdminUser(request: Request): Promise<User | null> {
    const user = await getUser(request)
    return user && isAdmin(user) ? user : null
}
