import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { conferenceConfig } from '~/config/conference-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { Year } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { Box, styled } from '~/styled-system/jsx'
import { PageLayout } from '~/components/page-layout'
import type { Route } from './+types/_layout.sponsors.($year)'

export async function loader({ params, context }: Route.LoaderArgs) {
    if (params.year && !/\d{4}/.test(params.year)) {
        throw redirect($path('/sponsors/:year?', { year: undefined }))
    }

    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : context.conferenceState.conference.year

    const yearConfig = getYearConfig(year)
    const sponsors = yearConfig.kind === 'conference' ? yearConfig.sponsors : {}

    const conferences = Object.values(conferenceConfig.conferences)
        .filter((conf) => conf.kind === 'conference')
        .map((conf) => ({
            year: conf.year,
        }))
        .sort((a, b) => parseInt(b.year) - parseInt(a.year))

    return data(
        {
            year,
            sponsors,
            conferences,
            cancelledMessage: yearConfig.kind === 'cancelled' ? yearConfig.cancelledMessage : undefined,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Sponsors() {
    const { year, sponsors, conferences, cancelledMessage } = useLoaderData<typeof loader>()
    const isLatestConference = conferences.every((c) => c.year <= year)

    return cancelledMessage ? (
        <Box color="white" textAlign="center" fontSize="3xl" mt="10">
            <p>
                {conferenceConfigPublic.name} {year} {isLatestConference ? 'is cancelled.' : 'was cancelled.'}
            </p>
            <Box color="white" textAlign="center" fontSize="lg" mt="10">
                <p>{cancelledMessage}</p>
            </Box>
            <SponsorSection sponsors={sponsors} year={year} />
            <ConferenceBrowser conferences={conferences} />
        </Box>
    ) : !sponsors || Object.keys(sponsors).length === 0 ? (
        <Box color="white" textAlign="center" fontSize="3xl" mt="10">
            <p>
                {conferenceConfigPublic.name} {year} sponsor information has not been{' '}
                {isLatestConference
                    ? 'announced yet.'
                    : `imported from the previous ${conferenceConfigPublic.name} site yet.`}
            </p>
            <ConferenceBrowser conferences={conferences} />
        </Box>
    ) : (
        <PageLayout minHeight="100vh">
            <Box width="full">
                <styled.h1 fontSize="5xl" textAlign="center" color="white" mb="8" mt="8">
                    DDD Perth {year} Sponsors
                </styled.h1>
                <styled.p fontSize="lg" textAlign="center" color="#C2C2FF" mb="12" maxWidth="800px" mx="auto">
                    We are grateful to all the sponsors who have supported DDD Perth over the years. Their contribution
                    makes it possible for us to run this community-driven conference.
                </styled.p>

                <Box mb="16">
                    <SponsorSection sponsors={sponsors} year={year} />
                </Box>

                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    )
}

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="white">
            <styled.h2 fontSize="xl" marginBottom="2" id="previous-years">
                View Previous Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" gap={4}>
                {conferences.map((conf) => (
                    <styled.a key={conf.year} href={`/sponsors/${conf.year}`} color="#8282FB">
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}