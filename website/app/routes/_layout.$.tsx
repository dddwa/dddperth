import { data, useLoaderData } from 'react-router'

import { DateTime } from 'luxon'
import type { PropsWithChildren } from 'react'
import { ImportantDates } from '~/components/page-components/important-dates'
import { Button } from '~/components/ui/button'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { socials } from '~/config/socials'
import { calculateImportantDates } from '~/lib/calculate-important-dates.server'
import { getConferenceActions } from '~/lib/conference-actions'
import type { ConferenceState } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { useMdxPage } from '~/lib/mdx'
import { css } from '~/styled-system/css'
import { Box, Grid, styled } from '~/styled-system/jsx'
import { prose } from '~/styled-system/recipes'
import { ContentPageLayout } from '~/components/page-layout'
import type { Route } from './+types/_layout.$'

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

    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await context.services.content.getPage(contentSlug, 'page')
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

    const yearConfig = getYearConfig(context.conferenceState.conference.year, context.config)
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    return data(
        {
            currentDate: context.dateTimeProvider.nowDate().toISO(),
            currentPath: contentSlug,
            siteUrl,
            frontmatter: post.frontmatter,
            slug: post.slug,
            conferenceState: context.conferenceState,
            importantDates,
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
        return [{ title: `404 Not Found | ${conferenceConfigPublic.name}` }]
    }

    // Generate a description if summary isn't available
    const description =
        frontmatter.summary ||
        `${frontmatter.title} - DDD Perth is an inclusive non-profit conference for the Perth software community.`

    // Generate keywords based on the content slug and title
    const baseKeywords = 'DDD Perth, Conference, Software Development, Perth Tech'
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

    return [
        { title: `${frontmatter.title} | ${conferenceConfigPublic.name}` },
        { name: 'description', content: description },
        { name: 'keywords', content: keywords },
        { property: 'og:type', content: 'article' },
        { property: 'og:url', content: url },
        { property: 'og:title', content: `${frontmatter.title} | ${conferenceConfigPublic.name}` },
        { property: 'og:image', content: socialImageUrl },
        { property: 'og:description', content: description },
        { property: 'og:site_name', content: conferenceConfigPublic.name },
        { property: 'og:locale', content: 'en_AU' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:creator', content: `@${socials.Twitter.Name}` },
        { name: 'twitter:site', content: `@${socials.Twitter.Name}` },
        { name: 'twitter:title', content: frontmatter.title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: socialImageUrl },
        { name: 'robots', content: 'index, follow' },
        { name: 'canonical', content: canonicalUrl },
        { name: 'article:published_time', content: new Date().toISOString() },
    ]
}

export default function WebsiteContentPage() {
    const { slug, frontmatter, currentPath, conferenceState, currentDate, importantDates } =
        useLoaderData<typeof loader>()
    const Component = useMdxPage(slug, 'page', conferenceState)

    return (
        <>
            {frontmatter.draft ? (
                <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
            ) : null}
            <ContentPageLayout>
                <ContentPageWithSidebar
                    currentPath={currentPath}
                    frontmatter={frontmatter}
                    conferenceState={conferenceState}
                    currentDate={DateTime.fromISO(currentDate, { zone: conferenceConfigPublic.timezone })}
                    importantDates={importantDates}
                >
                    <Component />
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
                        {DateTime.fromISO(relevantDate, { zone: conferenceConfigPublic.timezone }).toLocaleString(
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
