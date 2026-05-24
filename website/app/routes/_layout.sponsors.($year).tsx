import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { SponsorSection } from '~/components/page-components/SponsorSection'
import { conferenceManifest } from '@conference/manifest'
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

    const yearConfig = getYearConfig(year, context.config)
    const sponsors = yearConfig.kind === 'conference' ? yearConfig.sponsors : {}

    const conferences = Object.values(conferenceManifest.conferences.conferences)
        .filter((conf) => conf.kind === 'conference')
        .map((conf) => ({
            year: conf.year,
        }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year))

    const stillAcceptingSponsors =
        year === context.conferenceState.conference.year &&
        context.conferenceState.conferenceState === 'before-conference'

    return data(
        {
            year,
            sponsors,
            conferences,
            cancelledMessage: yearConfig.kind === 'cancelled' ? yearConfig.cancelledMessage : undefined,
            stillAcceptingSponsors,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export default function Sponsors() {
    const { year, sponsors, conferences, cancelledMessage, stillAcceptingSponsors } =
        useLoaderData<typeof loader>()
    const isLatestConference = conferences.every((c) => c.year <= year)

    return cancelledMessage ? (
        <PageLayout minHeight="100vh">
            <Box color="text.primary" textAlign="center" fontSize="3xl" mt="10">
                <p>
                    {conferenceManifest.public.name} {year}{' '}
                    {isLatestConference ? 'is cancelled.' : 'was cancelled.'}
                </p>
                <Box color="text.primary" textAlign="center" fontSize="lg" mt="10">
                    <p>{cancelledMessage}</p>
                </Box>
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    ) : !sponsors || Object.keys(sponsors).length === 0 ? (
        <PageLayout minHeight="100vh">
            <Box color="text.primary" textAlign="center" mt="10" mb="8">
                <styled.p fontSize="3xl">
                    {conferenceManifest.public.name} {year} sponsor information has not been{' '}
                    {isLatestConference
                        ? 'announced yet.'
                        : `imported from the previous ${conferenceManifest.public.name} site yet.`}
                </styled.p>
            </Box>
            {stillAcceptingSponsors ? <BecomeSponsorCta year={year} /> : null}
            <ConferenceBrowser conferences={conferences} />
        </PageLayout>
    ) : (
        <PageLayout minHeight="100vh">
            <Box width="full">
                <styled.h1 fontSize="5xl" textAlign="center" color="text.primary" mb="8" mt="8">
                    {conferenceManifest.public.name} {year} Sponsors
                </styled.h1>
                <styled.p fontSize="lg" textAlign="center" color="text.secondary" mb="12" maxWidth="[800px]" mx="auto">
                    We are grateful to all the sponsors who have supported {conferenceManifest.public.name} over the
                    years. Their contribution makes it possible for us to run this community-driven conference.
                </styled.p>

                <Box mb="16">
                    <SponsorSection sponsors={sponsors} year={year} />
                </Box>

                <ConferenceBrowser conferences={conferences} />
            </Box>
        </PageLayout>
    )
}

function BecomeSponsorCta({ year }: { year: Year }) {
    return (
        <Box
            mx="auto"
            maxWidth="[720px]"
            bgColor="surface.elevated"
            borderWidth="1px"
            borderColor="border.default"
            borderLeftWidth="4px"
            borderLeftColor="sponsor.platinum"
            rounded="lg"
            padding={{ base: '6', md: '8' }}
            mb="12"
            textAlign="center"
        >
            <styled.h2 fontSize="2xl" color="text.primary" mb="3">
                We&apos;re still accepting sponsors for {year}
            </styled.h2>
            <styled.p color="text.primary" mb="6">
                Sponsorship makes {conferenceManifest.public.name} possible — and we&apos;d love to talk
                about how your organisation can be part of this year&apos;s conference.
            </styled.p>
            <styled.a
                href="/sponsorship"
                display="inline-flex"
                alignItems="center"
                bgColor="brand.primary"
                color="text.on-brand"
                fontWeight="semibold"
                paddingX="6"
                paddingY="3"
                rounded="md"
                _hover={{ bgColor: 'brand.secondary' }}
            >
                See sponsorship options →
            </styled.a>
        </Box>
    )
}

function ConferenceBrowser({ conferences }: { conferences: { year: Year }[] }) {
    return (
        <styled.div padding="4" color="text.primary" textAlign="center">
            <styled.h2 fontSize="xl" marginBottom="2" id="previous-years">
                View Previous Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" gap="4" justifyContent="center">
                {conferences.map((conf) => (
                    <styled.a key={conf.year} href={`/sponsors/${conf.year}`} color="text.highlight">
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}