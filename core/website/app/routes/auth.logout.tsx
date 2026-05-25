import { logout } from '~/lib/auth.server'
import type { Route } from './+types/auth.logout'

export async function action({ request, context }: Route.ActionArgs) {
    return await logout(request.headers, context.services, '/')
}
