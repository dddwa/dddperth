import { logout } from '~/lib/auth.server'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/auth.logout'

export async function action({ request, context }: Route.ActionArgs) {
    return await logout(request.headers, getServices(context), '/')
}
