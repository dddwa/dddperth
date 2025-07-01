import { DateTime } from 'luxon'
import type { HeadersFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'
import type { Route } from './+types/_layout._index'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    return data(
        {
            currentDate: context.dateTimeProvider.nowDate().toISO(),
            conferenceDate: context.conferenceState.conference.date,
            importantDates,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Index() {
    const { importantDates, currentDate, conferenceDate } = useLoaderData<typeof loader>()

    return (
        <>
            <SkipToContent />
            <Hero
                currentDate={DateTime.fromISO(currentDate)}
                conferenceDate={conferenceDate}
                importantDates={importantDates}
            />
        </>
    )
}
