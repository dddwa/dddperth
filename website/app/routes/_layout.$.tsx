import { data, useLoaderData } from 'react-router'

import { trace } from '@opentelemetry/api'
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
import { getPage } from '~/lib/mdx.server'
import { css } from '~/styled-system/css'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import { prose } from '~/styled-system/recipes'
import type { Route } from './+types/_layout.$'

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const requestUrl = new URL(request.url)
    if (contentSlug.startsWith('/static')) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    if (contentSlug.includes('.well-known')) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await getPage(contentSlug, 'page')
    if (!post) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (post.frontmatter.draft) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (!post.frontmatter.title) {
        trace.getActiveSpan()?.recordException(new Error(`Missing title in frontmatter for ${contentSlug}`))
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const yearConfig = getYearConfig(context.conferenceState.conference.year)
    const importantDates = yearConfig.kind === 'cancelled' ? [] : calculateImportantDates(yearConfig)

    return data(
        {
            currentDate: context.dateTimeProvider.nowDate().toISODate(),
            currentPath: contentSlug,
            siteUrl,
            frontmatter: post.frontmatter,
            post: post.code,
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
    const { data, params } = args
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const { siteUrl, post, frontmatter } = data || {}
    if (!post || !frontmatter) {
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
    const { post, frontmatter, currentPath, conferenceState, currentDate, importantDates } =
        useLoaderData<typeof loader>()
    const Component = useMdxPage(post, conferenceState)

    return (
        <>
            {frontmatter.draft ? (
                <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
            ) : null}
            <div>
                <Flex
                    position="relative"
                    bgGradient="to-b"
                    gradientFrom="#070727"
                    gradientToPosition="99%"
                    gradientTo="#0E0E43"
                    w="100%"
                    color="white"
                >
                    <Box w="100%" position="relative" maxW="1200px" m="0 auto" md={{ p: '4' }}>
                        <ContentPageWithSidebar
                            currentPath={currentPath}
                            frontmatter={frontmatter}
                            conferenceState={conferenceState}
                            currentDate={DateTime.fromISO(currentDate)}
                            importantDates={importantDates}
                        >
                            <Component />
                        </ContentPageWithSidebar>
                    </Box>
                </Flex>
            </div>
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
        <Grid gridTemplateColumns={{ base: '1ft', lg: '1fr auto' }}>
            <styled.main id="content" marginX={{ base: 6, lg: 0 }}>
                <styled.h1 fontSize="3xl">{frontmatter.title}</styled.h1>
                <Box className={prose({ size: 'lg' })}>{children}</Box>
            </styled.main>
            <styled.aside
                display="flex"
                flexDirection="column"
                height="fit-content"
                bgGradient="to-r"
                gradientFrom="#1F1F4E"
                gradientTo="#151544"
                shadow="md"
                p={4}
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
                    <time>{new Date(relevantDate).toDateString()}</time>
                </h2>
            ) : null}
            <ul
                className={css({
                    paddingLeft: 'md',
                    marginBottom: 'lg',
                    marginLeft: 'lg',

                    '&li': {
                        paddingLeft: 'xs',
                        fill: '2023-pink',
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
                            color="#520030"
                            _hover={{ gradientTo: '#FF52B7' }}
                            bgGradient="to-r"
                            gradientFrom="#FF52B7"
                            gradientTo="#FF8273"
                            fontWeight={600}
                            borderRightRadius={100}
                            py={2}
                            px={4}
                        >
                            {primaryCta.title} ↗
                        </styled.a>
                    </Button>
                </div>
            )}
        </div>
    )
}
