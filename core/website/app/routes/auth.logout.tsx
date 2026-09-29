import { logout } from '~/lib/auth.server'
import { sanitiseRedirect } from '~/lib/auth/validation'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/auth.logout'

export async function action({ request, context }: Route.ActionArgs) {
    const redirectTo = (await request.formData()).get('redirectTo')
    return await logout(
        request.headers,
        getServices(context),
        typeof redirectTo === 'string' && redirectTo ? sanitiseRedirect(redirectTo) : '/',
    )
}
