import { conferenceTime } from '~/lib/dates/temporal'
import type { HeadersFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { formatEventWhen, upcomingEvents } from '~/lib/events/event-form'
import { CACHE_CONTROL } from '~/lib/http.server'
import { recordException } from '~/lib/record-exception'
import { resolveSponsorsWithFallback } from '~/lib/sponsor-fallback.server'
import { Hero } from '../components/hero/hero'
import type { Route } from './+types/_layout._index'
import { getConferences, getConferenceState, getConfig, getDateTimeProvider, getServices } from '~/remix-app-load-context'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context, getConferenceState(context).conference.year)
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    const heroSponsors = resolveSponsorsWithFallback(
        getConferences(context),
        getConferenceState(context).conference.year,
        getConferenceState(context).conference.sponsors,
        getConfig(context).useSponsorFixtures,
    )

    const now = getDateTimeProvider(context).nowDate()
    // Skipped under the e2e fixtures: the test servers share the developer's
    // local D1, so events made while trying out /admin/events would otherwise
    // land in the home page's visual baselines.
    const events = getConfig(context).useSponsorFixtures
        ? []
        : upcomingEvents(await listEventsOrNone(context), now).map((event) => ({
              id: event.id,
              slug: event.slug,
              title: event.title,
              when: formatEventWhen(event),
              location: event.location,
              locationUrl: event.locationUrl,
          }))

    return data(
        {
            events,
            currentDate: now.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }),
            conferenceDate: getConferenceState(context).conference.date,
            importantDates,
            heroSponsors,
            // Passed separately so the "Sponsor 2026" CTA always names the
            // *current* conference year, not the year the fallback came from.
            currentYear: getConferenceState(context).conference.year,
            conferenceState: getConferenceState(context),
        },
        // Not `conf` (a day): events are edited in /admin, and a new one
        // shouldn't take a day to show up on client-side navigation.
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

/** The home page must not 500 because the events table can't be read; it
 * just loses that section. */
async function listEventsOrNone(context: Route.LoaderArgs['context']) {
    try {
        return await getServices(context).events.list()
    } catch (error) {
        recordException(error, { attributes: { where: 'home page events' } })
        return []
    }
}

export default function Index() {
    const { events, importantDates, currentDate, conferenceDate, heroSponsors, currentYear, conferenceState } =
        useLoaderData<typeof loader>()

    return (
        <Hero
            currentDate={conferenceTime(currentDate)}
            conferenceDate={conferenceDate}
            importantDates={importantDates}
            sponsors={heroSponsors}
            currentYear={currentYear}
            conferenceState={conferenceState}
            events={events}
        />
    )
}
