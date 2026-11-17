import { conferenceManifest } from '@conference/manifest'
import { calendarEventDetails, eventIcs } from '~/lib/events/event-calendar'
import { eventSummary, renderEventMarkdown } from '~/lib/events/event-markdown.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/events.$slug.calendar[.ics]'

/**
 * GET /events/<slug>/calendar.ics
 *
 * One event as a calendar file, for the event page's "Add to calendar". A
 * real URL rather than a `data:` link, because iOS Safari hands a
 * `text/calendar` response straight to Calendar but won't open a `data:` one.
 */
export async function loader({ params, context }: Route.LoaderArgs) {
    const event = await getServices(context).events.getBySlug(params.slug)
    // Same rule as the page: drafts 404 like unknown slugs.
    if (!event || !event.published) throw new Response('Not Found', { status: 404 })

    const summary = eventSummary(await renderEventMarkdown(event.description), 500)
    const details = calendarEventDetails(event, {
        siteOrigin: `https://${conferenceManifest.brand.domain}`,
        summary,
    })

    return new Response(eventIcs(details, { productId: conferenceManifest.public.name }), {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
            'Cache-Control': CACHE_CONTROL.DEFAULT,
            'X-Robots-Tag': 'noindex',
        },
    })
}
