import { isAdminUser, requireUser } from '~/lib/auth.server'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/portal.logo.$issueKey'

/**
 * Streams a sponsor's uploaded logo back out of R2. Only that sponsor's own
 * contacts and admins may fetch it — logos aren't public in Phase 1 (they
 * reach the public site via the committee's import tool).
 *
 * SVG note: uploads aren't sanitised yet, so this response is locked down —
 * nosniff plus a CSP that blocks scripts — and the portal only ever renders
 * it via <img>, which never executes SVG scripts. Proper sanitisation lands
 * with the public-rendering work in Phase 2.
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
    const user = await requireUser(request, context)
    const services = getServices(context)

    const issueKey = params.issueKey
    const sponsor = await services.sponsors.getSponsorForEmail(user.email)
    const isOwnSponsor = sponsor?.issueKey === issueKey

    if (!isOwnSponsor && !(await isAdminUser(user, services))) {
        throw new Response('Not Found', { status: 404 })
    }

    const profile = await services.sponsors.getProfile(issueKey)
    if (!profile?.logo) {
        throw new Response('Not Found', { status: 404 })
    }

    const asset = await services.assets.get(profile.logo.r2Key)
    if (!asset) {
        throw new Response('Not Found', { status: 404 })
    }

    const headers = new Headers({
        'Content-Type': asset.contentType,
        'Content-Length': String(asset.size),
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'",
        'Cache-Control': 'private, max-age=60',
    })

    if (new URL(request.url).searchParams.has('download')) {
        const safeName = profile.logo.filename.replace(/[^\w.\- ]/g, '_')
        headers.set('Content-Disposition', `attachment; filename="${safeName}"`)
    }

    return new Response(asset.body, { headers })
}
