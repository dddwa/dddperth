import { DateTime } from 'luxon'
import type { HeadersFunction, LoaderFunctionArgs} from 'react-router';
import { data, useLoaderData } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: LoaderFunctionArgs) {
    const { yearConfig } = getYearConfig(context.conferenceState.conference.year, context.conferenceState.conference)

    return data(
        {
            currentDate: context.dateTimeProvider.nowDate().toISODate(),
            conferenceYear: context.conferenceState.conference.year,
            yearConfig,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Index() {
    const { conferenceYear, currentDate, yearConfig } = useLoaderData<typeof loader>()

    return (
        <>
            <SkipToContent />
            <Hero year={conferenceYear} currentDate={DateTime.fromISO(currentDate)} config={yearConfig} />
        </>
    )
}
