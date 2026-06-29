import { DateTime } from 'luxon'
import type { HeadersFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { resolveSponsorsWithFallback } from '~/lib/sponsor-fallback.server'
import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'
import type { Route } from './+types/_layout._index'
import { getConferenceState, getConfig, getDateTimeProvider } from '~/remix-app-load-context'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(getConferenceState(context).conference.year, getConfig(context))
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    const heroSponsors = resolveSponsorsWithFallback(
        getConferenceState(context).conference.year,
        getConferenceState(context).conference.sponsors,
    )

    return data(
        {
            currentDate: getDateTimeProvider(context).nowDate().toISO(),
            conferenceDate: getConferenceState(context).conference.date,
            importantDates,
            heroSponsors,
            // Passed separately so the "Sponsor 2026" CTA always names the
            // *current* conference year, not the year the fallback came from.
            currentYear: getConferenceState(context).conference.year,
            conferenceState: getConferenceState(context),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Index() {
    const { importantDates, currentDate, conferenceDate, heroSponsors, currentYear, conferenceState } =
        useLoaderData<typeof loader>()

    return (
        <>
            <SkipToContent />
            <Hero
                currentDate={DateTime.fromISO(currentDate, { zone: conferenceManifest.public.timezone })}
                conferenceDate={conferenceDate}
                importantDates={importantDates}
                sponsors={heroSponsors}
                currentYear={currentYear}
                conferenceState={conferenceState}
            />
        </>
    )
}
