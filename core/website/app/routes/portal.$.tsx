import { redirect } from 'react-router'
import type { Route } from './+types/portal.$'

/**
 * The sponsor portal used to live at /portal. Sponsors were emailed links to
 * it (the follow-up and feedback emails), so the old paths keep working.
 *
 * 308 rather than 301 so a form posted from a tab opened before the move
 * still reaches the action instead of being downgraded to a GET.
 */
function toSponsorPortal(request: Request, splat: string | undefined): Response {
    const { search } = new URL(request.url)
    const rest = splat ? `/${splat}` : ''
    return redirect(`/sponsor-portal${rest}${search}`, 308)
}

export function loader({ request, params }: Route.LoaderArgs) {
    return toSponsorPortal(request, params['*'])
}

export function action({ request, params }: Route.ActionArgs) {
    return toSponsorPortal(request, params['*'])
}
