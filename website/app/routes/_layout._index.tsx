import { useLoaderData } from '@remix-run/react'
import { HeadersFunction, json, LoaderFunctionArgs } from '@remix-run/server-runtime'
import { DateTime } from 'luxon'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Hero } from '../components/hero/hero'
import { SkipToContent } from '../components/skip-to-content'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: LoaderFunctionArgs) {
    return json(
        {
            currentDate: context.dateTimeProvider.nowDate().toISODate(),
            conferenceYear: context.conferenceState.conference.year,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Index() {
    const { conferenceYear, currentDate } = useLoaderData<typeof loader>()

    return (
        <>
            <SkipToContent />
            <Hero year={conferenceYear} currentDate={DateTime.fromISO(currentDate)} />
        </>
    )
}
