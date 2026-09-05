import { conferenceManifest } from '@conference/manifest'
import { data, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { SponsorOverview, SponsorSection } from '~/components/page-components/SponsorSection'
import { PageLayout } from '~/components/page-layout'
import type { Year, YearSponsors } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.sponsors.($year)'

/** True when a year's sponsor list is absent or empty in every tier. */
function hasNoSponsors(sponsors: YearSponsors | undefined): boolean {
    if (!sponsors) return true
    // Tiers are optional arrays, so an object with only empty arrays still
    // renders an empty page — check the contents, not the key count.
    return Object.values(sponsors).every((tier) => !tier || tier.length === 0)
}

/**
 * Whether `/sponsors/<year>` should bounce to that year's agenda, given
 * `redirectPastSponsorsToAgenda` is on. Only past years with nothing to show
 * qualify: a current or future year, a year that has sponsors, and a
 * cancelled year (which has its own message to render) all stay put.
 */
function shouldRedirectToAgenda(year: Year, currentYear: Year): boolean {
    if (parseInt(year) >= parseInt(currentYear)) return false
    const yearConfig = conferenceManifest.conferences.conferences[year]
    if (!yearConfig || yearConfig.kind !== 'conference') return false
    return hasNoSponsors(yearConfig.sponsors)
}

export async function loader({ params, context }: Route.LoaderArgs) {
    if (params.year && !/\d{4}/.test(params.year)) {
        throw redirect($path('/sponsors/:year?', { year: undefined }))
    }

    const year =
        params.year && /\d{4}/.test(params.year) ? (params.year as Year) : getConferenceState(context).conference.year

    const yearConfig = getYearConfig(year, getConfig(context))
    const sponsors = yearConfig.kind === 'conference' ? yearConfig.sponsors : {}

    const currentYear = getConferenceState(context).conference.year
    const redirectPastSponsors = conferenceManifest.public.features?.redirectPastSponsorsToAgenda === true

    if (redirectPastSponsors && shouldRedirectToAgenda(year, currentYear)) {
        throw redirect($path('/agenda/:year?', { year }))
    }

    const conferences = Object.values(conferenceManifest.conferences.conferences)
        .filter((conf) => conf.kind === 'conference')
        // Don't list a year whose sponsors page would only bounce the visitor
        // on to an agenda — same predicate as the redirect above, so the link
        // list and the redirect can't disagree.
        .filter((conf) => !redirectPastSponsors || !shouldRedirectToAgenda(conf.year, currentYear))
        .map((conf) => ({
            year: conf.year,
        }))
        .sort((a, b) => parseInt(a.year) - parseInt(b.year))

    const stillAcceptingSponsors =
        year === getConferenceState(context).conference.year &&
        getConferenceState(context).conferenceState === 'before-conference'

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
    const { year, sponsors, conferences, cancelledMessage, stillAcceptingSponsors } = useLoaderData<typeof loader>()
    const isLatestConference = conferences.every((c) => c.year <= year)

    // The populated branch below renders a visible <h1>; the cancelled and
    // "not announced yet" branches had none at all, so those states gave
    // screen reader users no heading-level entry point. Mirrors the same
    // srOnly pattern used on the agenda page for its empty states.
    const pageHeading = (
        <styled.h1 srOnly>
            {conferenceManifest.public.name} {year} Sponsors
        </styled.h1>
    )

    return cancelledMessage ? (
        <PageLayout minHeight="100vh">
            {pageHeading}
            <Box color="text.primary" textAlign="center" fontSize="3xl" mt="10">
                <p>
                    {conferenceManifest.public.name} {year} {isLatestConference ? 'is cancelled.' : 'was cancelled.'}
                </p>
                <Box color="text.primary" textAlign="center" fontSize="lg" mt="10">
                    <p>{cancelledMessage}</p>
                </Box>
                <SponsorSection sponsors={sponsors} year={year} />
                <ConferenceBrowser conferences={conferences} currentYear={year} />
            </Box>
        </PageLayout>
    ) : !sponsors || Object.keys(sponsors).length === 0 ? (
        <PageLayout minHeight="100vh">
            {pageHeading}
            <Box color="text.primary" textAlign="center" mt="10" mb="8">
                <styled.p fontSize="3xl">
                    {conferenceManifest.public.name} {year} sponsor information has not been{' '}
                    {isLatestConference
                        ? 'announced yet.'
                        : `imported from the previous ${conferenceManifest.public.name} site yet.`}
                </styled.p>
            </Box>
            {stillAcceptingSponsors ? <BecomeSponsorCta year={year} /> : null}
            <ConferenceBrowser conferences={conferences} currentYear={year} />
        </PageLayout>
    ) : (
        <PageLayout minHeight="100vh">
            <Box width="full">
                <styled.h1 fontSize="5xl" textAlign="center" color="text.primary" mb="8" mt="8">
                    {conferenceManifest.public.name} {year} Sponsors
                </styled.h1>
                <styled.p fontSize="lg" textAlign="center" color="text.secondary" mb="8" maxWidth="[800px]" mx="auto">
                    We are grateful to all the sponsors who have supported {conferenceManifest.public.name} over the
                    years. Their contribution makes it possible for us to run this community-driven conference.
                </styled.p>

                {conferenceManifest.public.features?.sponsorOverview ? <SponsorOverview sponsors={sponsors} /> : null}

                <Box mb="16">
                    <SponsorSection sponsors={sponsors} year={year} />
                </Box>

                <ConferenceBrowser conferences={conferences} currentYear={year} />
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
                Sponsorship makes {conferenceManifest.public.name} possible — and we&apos;d love to talk about how your
                organisation can be part of this year&apos;s conference.
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

function ConferenceBrowser({ conferences, currentYear }: { conferences: { year: Year }[]; currentYear: Year }) {
    // "Previous" means conferences earlier than the one being viewed. This drops
    // the current/upcoming year (which has no agenda to link to yet) and any
    // future years. If there's no history, don't render the section at all.
    const previous = conferences.filter((conf) => parseInt(conf.year) < parseInt(currentYear))
    if (previous.length === 0) return null
    return (
        <styled.div padding="4" color="text.primary" textAlign="center">
            <styled.h2 fontSize="xl" marginBottom="2" id="previous-years">
                View Previous Conferences
            </styled.h2>
            <styled.div display="flex" flexWrap="wrap" gap="4" justifyContent="center">
                {previous.map((conf) => (
                    <styled.a key={conf.year} href={`/sponsors/${conf.year}`} color="text.highlight">
                        <styled.span fontSize="lg">{conf.year}</styled.span>
                    </styled.a>
                ))}
            </styled.div>
        </styled.div>
    )
}
