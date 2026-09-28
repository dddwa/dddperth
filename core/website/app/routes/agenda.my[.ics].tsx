import { conferenceManifest } from '@conference/manifest'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { buildMyAgendaCalendar, parseRequestedTalkIds } from '~/lib/my-agenda-calendar.server'
import { getPublishedSchedule, scheduleTalks } from '~/lib/published-agenda.server'
import { slugify } from '~/lib/slugify'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import type { Route } from './+types/agenda.my[.ics]'

/**
 * GET /agenda/my.ics?talks=123,456
 *
 * A person's picked talks as a calendar file. Picks live only in their
 * browser, so the ids come in on the query string.
 *
 * The ids can say anything, so they are only ever used to *filter* the current
 * conference's published agenda (`getPublishedSchedule`): no year parameter,
 * no Sessionize lookup by id, nothing served before publication. The file can
 * contain nothing a visitor couldn't already read on `/agenda`.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
    const year = getConferenceState(context).conference.year
    const schedule = await getPublishedSchedule(context, year)
    const yearConfig = getYearConfig(year, getConfig(context))

    const url = new URL(request.url)
    const calendar = schedule
        ? buildMyAgendaCalendar({
              talks: scheduleTalks(schedule),
              requestedIds: parseRequestedTalkIds(url.searchParams.get('talks')),
              timezone: conferenceManifest.public.timezone,
              conferenceName: conferenceManifest.public.name,
              year,
              siteOrigin: url.origin,
              venue: yearConfig.kind === 'conference' ? yearConfig.venue : undefined,
          })
        : undefined

    if (!calendar) {
        return new Response('None of those talks are on the published agenda.', {
            status: 404,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
    }

    return new Response(calendar, {
        headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${slugify(`${conferenceManifest.public.name} ${year} my agenda`)}.ics"`,
            'Cache-Control': CACHE_CONTROL.schedule,
            'X-Robots-Tag': 'noindex',
        },
    })
}
