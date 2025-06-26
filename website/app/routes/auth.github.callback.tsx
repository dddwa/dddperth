import { redirect } from 'react-router'
import { authenticator, createUserSession, isAdmin } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import type { Route } from './+types/auth.github.callback'

export async function loader({ request }: Route.LoaderArgs) {
    try {
        const user = await authenticator.authenticate('github', request)

        // Check if user is admin
        if (!isAdmin(user)) {
            throw redirect('/auth/login?error=access_denied')
        }

        // Create user session and redirect to admin
        return await createUserSession(request, user, '/admin')
    } catch (error) {
        // If authentication fails, redirect to login
        if (error instanceof Response) {
            throw error
        }
        recordException(error)
        return redirect('/auth/login?error=auth_failed')
    }
}
