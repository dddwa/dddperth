import { data, useLoaderData } from 'react-router'

import { DateTime } from 'luxon'
import type { PropsWithChildren } from 'react'
import { ImportantDates } from '~/components/page-components/important-dates'
import { Button } from '~/components/ui/button'
import { conferenceManifest } from '@conference/manifest'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getConferenceActions } from '~/lib/conference-actions'
import type { ConferenceState } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { useMdxPage } from '~/lib/mdx'
import { resolveSponsorsWithFallback } from '~/lib/sponsor-fallback.server'
import { getSponsorPageData } from '~/lib/sponsor-page-data.server'
import { css } from '~/styled-system/css'
import { Box, Grid, styled } from '~/styled-system/jsx'
import { prose } from '~/styled-system/recipes'
import { ContentPageLayout, PageLayout } from '~/components/page-layout'
import type { Route } from './+types/_layout.$'
import { getConferenceState, getConfig, getDateTimeProvider, getServices } from '~/remix-app-load-context'

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const requestUrl = new URL(request.url)
    if (contentSlug.startsWith('/static')) {
        console.log('Attempt to access static asset through content route:', contentSlug)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    if (contentSlug.includes('.well-known')) {
        console.log('Attempt to access .well-known through content route:', contentSlug)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    // Underscore-prefixed slugs are MDX fragments embedded in other pages
    // (e.g. `_home-hero`, `_acknowledgement`) — not navigable.
    if (contentSlug.startsWith('_')) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await getServices(context).content.getPage(contentSlug, 'page')
    if (!post) {
        console.log('Content not found for slug:', contentSlug)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (post.frontmatter.draft) {
        console.log('Attempt to access draft content through content route:', contentSlug)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (!post.frontmatter.title) {
        console.error(`Missing title in frontmatter for ${contentSlug}`)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const yearConfig = getYearConfig(getConferenceState(context).conference.year, getConfig(context))
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    const sponsorPageData = getSponsorPageData()

    // Sponsors shown in the tickets-page acknowledgement. Platinum + Gold
    // from the current year if available, else the most recent prior year
    // (in which case the MDX component switches to "past supporters" copy
    // and adds a "Sponsor [year]" CTA — see lib/mdx.tsx).
    const ticketSponsorsResolved = resolveSponsorsWithFallback(
        getConferenceState(context).conference.year,
        getConferenceState(context).conference.sponsors,
    )
    const ticketSponsors =
        ticketSponsorsResolved.kind === 'empty'
            ? undefined
            : {
                  currentYear: getConferenceState(context).conference.year,
                  sponsors: [
                      ...(ticketSponsorsResolved.sponsors.platinum ?? []),
                      ...(ticketSponsorsResolved.sponsors.gold ?? []),
                  ],
                  isFallback: ticketSponsorsResolved.kind === 'fallback',
              }

    return data(
        {
            currentDate: getDateTimeProvider(context).nowDate().toISO(),
            currentPath: contentSlug,
            siteUrl,
            frontmatter: post.frontmatter,
            slug: post.slug,
            conferenceState: getConferenceState(context),
            importantDates,
            sponsorPageData,
            ticketSponsors,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.doc } },
    )
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    // Inherit the caching headers from the loader so we don't cache 404s
    return loaderHeaders
}

export function meta(args: Route.MetaArgs) {
    const { loaderData, params } = args
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const { siteUrl, frontmatter } = loaderData || {}
    if (!frontmatter) {
        return [{ title: `404 Not Found | ${conferenceManifest.public.name}` }]
    }

    // Generate a description if summary isn't available
    const description =
        frontmatter.summary || `${frontmatter.title} - ${conferenceManifest.public.description}`

    // Generate keywords based on the content slug and title
    const baseKeywords = `${conferenceManifest.public.name}, Conference, Software Development`
    const pageKeywords = `${frontmatter.title}, ${contentSlug.replace(/[/]/g, ', ').replace(/-/g, ' ')}`
    const keywords = `${pageKeywords}, ${baseKeywords}`

    // Fix the image URL generation
    const ogImageUrl = siteUrl ? new URL(`${siteUrl}/images/logo.png`) : null
    if (ogImageUrl && frontmatter.title) {
        // Use the existing logo as fallback if no specific image
        ogImageUrl.searchParams.set('title', frontmatter.title)
    }

    const socialImageUrl = ogImageUrl?.toString()

    // Fix the URL to point to the correct content page, not blog
    const url = siteUrl ? `${siteUrl}/${contentSlug}` : null
    const canonicalUrl = url

    const twitterHandle = conferenceManifest.socials.Twitter?.Name

    return [
        { title: `${frontmatter.title} | ${conferenceManifest.public.name}` },
        { name: 'description', content: description },
        { name: 'keywords', content: keywords },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: url },
        { property: 'og:title', content: `${frontmatter.title} | ${conferenceManifest.public.name}` },
        { property: 'og:image', content: socialImageUrl },
        { property: 'og:description', content: description },
        { property: 'og:site_name', content: conferenceManifest.public.name },
        { property: 'og:locale', content: 'en_AU' },
        { name: 'twitter:card', content: 'summary_large_image' },
        // Only emit Twitter creator/site tags if the conference has a Twitter account.
        ...(twitterHandle
            ? [
                  { name: 'twitter:creator', content: `@${twitterHandle}` },
                  { name: 'twitter:site', content: `@${twitterHandle}` },
              ]
            : []),
        { name: 'twitter:title', content: frontmatter.title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: socialImageUrl },
        { name: 'robots', content: 'index, follow' },
        { name: 'canonical', content: canonicalUrl },
        { name: 'article:published_time', content: new Date().toISOString() },
    ]
}

export default function WebsiteContentPage() {
    const {
        slug,
        frontmatter,
        currentPath,
        conferenceState,
        currentDate,
        importantDates,
        sponsorPageData,
        ticketSponsors,
    } = useLoaderData<typeof loader>()
    const Component = useMdxPage(slug, 'page', conferenceState, ticketSponsors)

    const draftBanner = frontmatter.draft ? (
        <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
    ) : null

    if (frontmatter.layout === 'full-width') {
        return (
            <>
                {draftBanner}
                <PageLayout minHeight="100vh">
                    <Component sponsors={sponsorPageData} />
                </PageLayout>
            </>
        )
    }

    return (
        <>
            {draftBanner}
            <ContentPageLayout>
                <ContentPageWithSidebar
                    currentPath={currentPath}
                    frontmatter={frontmatter}
                    conferenceState={conferenceState}
                    currentDate={DateTime.fromISO(currentDate, { zone: conferenceManifest.public.timezone })}
                    importantDates={importantDates}
                >
                    <Component sponsors={sponsorPageData} />
                </ContentPageWithSidebar>
            </ContentPageLayout>
        </>
    )
}

export const styledSidebarContainer = css({})

function ContentPageWithSidebar({
    frontmatter,
    importantDates,
    currentDate,
    children,
}: PropsWithChildren<
    { currentDate: DateTime } & Pick<
        Awaited<ReturnType<typeof useLoaderData<typeof loader>>>,
        'conferenceState' | 'frontmatter' | 'currentPath' | 'importantDates'
    >
>) {
    return (
        <Grid gridTemplateColumns={{ base: '1fr', lg: '1fr auto' }}>
            <styled.main id="content" marginX={{ base: "6", lg: "0" }}>
                <styled.h1 fontSize="3xl">{frontmatter.title}</styled.h1>
                <Box className={prose({ size: 'lg' })}>{children}</Box>
            </styled.main>
            <styled.aside
                display="flex"
                flexDirection="column"
                height="fit"
                bgGradient="to-r"
                gradientFrom="surface.card"
                gradientTo="surface.card-alt"
                shadow="md"
                p="4"
                rounded="xl"
            >
                {/* <EventDetailsSummary conferenceState={conferenceState} currentPath={currentPath} /> */}

                <ImportantDates
                    smallSidebar={true}
                    showOnlyLive={true}
                    importantDates={importantDates}
                    currentDate={currentDate}
                />

                {/* TODO Important date list */}
                {/* <ImportantDatesList layout="inline" conference={conference} currentDate={currentDate} /> */}
            </styled.aside>
        </Grid>
    )
}

export interface EventDetailsSummaryProps {
    conferenceState: ConferenceState
    currentPath: string
    className?: string
}

export const EventDetailsSummary = ({ className, conferenceState, currentPath }: EventDetailsSummaryProps) => {
    const [primaryCta] = getConferenceActions(conferenceState).filter((a) => a.url !== currentPath)

    const relevantDate = conferenceState.conference.date

    return (
        <div className={className}>
            {relevantDate ? (
                <h2>
                    <small style={{ display: 'block' }}>
                        {conferenceState.conferenceState === 'before-conference' ? 'Next event' : 'Previous event'}
                    </small>
                    <time>
                        {DateTime.fromISO(relevantDate, { zone: conferenceManifest.public.timezone }).toLocaleString(
                            DateTime.DATE_HUGE,
                            { locale: 'en-AU' },
                        )}
                    </time>
                </h2>
            ) : null}
            <ul
                className={css({
                    paddingLeft: "5",
                    marginBottom: "6",
                    marginLeft: "6",

                    '&li': {
                        paddingLeft: "2",
                        fill: 'brand.secondary',
                        listStyleImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M0 0h6v6H0z'/%3E%3C/svg%3E")`,
                        listStyleType: 'none',
                    },
                })}
            >
                {conferenceState.ticketSales.state === 'sold-out' && (
                    <li>
                        <strong>SOLD OUT</strong>
                    </li>
                )}
                {conferenceState.ticketSales.state === 'wait-list-open' && (
                    <li>
                        <strong>WAITLIST OPEN</strong>
                    </li>
                )}
                {/* {conference.SellingPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                ))} */}
                {conferenceState.ticketSales.state === 'open' && conferenceState.conference.currentTicketSale ? (
                    <styled.li fontSize="xl" fontWeight="semibold">
                        Currently only {conferenceState.conference.currentTicketSale.price}
                    </styled.li>
                ) : null}
            </ul>
            {primaryCta && (
                <div style={{ textAlign: 'center' }}>
                    <Button asChild>
                        <styled.a
                            href={primaryCta.url}
                            color="gradient.cta-start"
                            _hover={{ gradientTo: 'brand.secondary' }}
                            bgGradient="to-r"
                            gradientFrom="brand.secondary"
                            gradientTo="gradient.cta-end"
                            fontWeight="semibold"
                            borderRightRadius="full"
                            py="2"
                            px="4"
                        >
                            {primaryCta.title} ↗
                        </styled.a>
                    </Button>
                </div>
            )}
        </div>
    )
}
