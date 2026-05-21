import { DateTime } from 'luxon'
import type { HeadersFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import { conferenceConfigPublic } from '@ddd/conference-config/public'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { resolveSponsorsWithFallback } from '~/lib/sponsor-fallback.server'
import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'
import type { Route } from './+types/_layout._index'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year, context.config)
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    const heroSponsors = resolveSponsorsWithFallback(
        context.conferenceState.conference.year,
        context.conferenceState.conference.sponsors,
    )

    return data(
        {
            currentDate: context.dateTimeProvider.nowDate().toISO(),
            conferenceDate: context.conferenceState.conference.date,
            importantDates,
            heroSponsors,
            // Passed separately so the "Sponsor 2026" CTA always names the
            // *current* conference year, not the year the fallback came from.
            currentYear: context.conferenceState.conference.year,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Index() {
    const { importantDates, currentDate, conferenceDate, heroSponsors, currentYear } =
        useLoaderData<typeof loader>()

    return (
        <>
            <SkipToContent />
            <Hero
                currentDate={DateTime.fromISO(currentDate, { zone: conferenceConfigPublic.timezone })}
                conferenceDate={conferenceDate}
                importantDates={importantDates}
                sponsors={heroSponsors}
                currentYear={currentYear}
            />
        </>
    )
}
