import { logout } from '~/lib/auth.server'
import type { Route } from './+types/auth.logout'

export async function action({ request }: Route.ActionArgs) {
    return await logout(request, '/')
}
