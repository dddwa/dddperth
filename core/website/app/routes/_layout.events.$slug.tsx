import { conferenceManifest } from '@conference/manifest'
import { data, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { ContentPageLayout } from '~/components/page-layout'
import { eventStatus, formatEventWhen } from '~/lib/events/event-form'
import { EventMarkdown } from '~/lib/events/event-markdown'
import { eventSummary, renderEventMarkdown } from '~/lib/events/event-markdown.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getDateTimeProvider, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { prose } from '~/styled-system/recipes'
import type { Route } from './+types/_layout.events.$slug'

export async function loader({ params, context }: Route.LoaderArgs) {
    const event = await getServices(context).events.getBySlug(params.slug)
    // Drafts 404 like unknown slugs, so a guessed URL can't preview one.
    if (!event || !event.published) throw new Response('Not Found', { status: 404 })

    const description = await renderEventMarkdown(event.description)
    const now = getDateTimeProvider(context).nowDate()

    return data(
        {
            title: event.title,
            when: formatEventWhen(event),
            finished: eventStatus(event, now) === 'past',
            location: event.location,
            locationUrl: event.locationUrl,
            url: event.url,
            linkLabel: event.linkLabel,
            description,
            summary: eventSummary(description),
            canonicalUrl: `https://${conferenceManifest.brand.domain}/events/${event.slug}`,
        },
        // Short: the event is edited in /admin, and a fix shouldn't take long to show.
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    return loaderHeaders
}

export function meta({ loaderData }: Route.MetaArgs) {
    const name = conferenceManifest.public.name
    if (!loaderData) return [{ title: `404 Not Found | ${name}` }]

    const title = `${loaderData.title} | ${name}`
    const description = loaderData.summary || `${loaderData.title}, ${loaderData.when}`
    return [
        { title },
        { name: 'description', content: description },
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: loaderData.canonicalUrl },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:site_name', content: name },
        { property: 'og:locale', content: 'en_AU' },
        { tagName: 'link', rel: 'canonical', href: loaderData.canonicalUrl },
    ]
}

export default function EventPage() {
    const { title, when, finished, location, locationUrl, url, linkLabel, description } =
        useLoaderData<typeof loader>()

    return (
        <ContentPageLayout>
            <Box id="content" marginX={{ base: '6', lg: '0' }} maxW="4xl">
                <styled.h1 fontSize="3xl">{title}</styled.h1>

                <Flex
                    flexDirection="column"
                    gap="3"
                    my="6"
                    p="4"
                    rounded="lg"
                    color="text.primary"
                    bgGradient="to-r"
                    gradientFrom="surface.card"
                    gradientTo="surface.card-alt"
                    shadow="md"
                >
                    {finished && (
                        <styled.p fontWeight="semibold" role="status">
                            This event has finished.
                        </styled.p>
                    )}
                    <styled.dl display="flex" flexDirection="column" gap="3">
                    <div>
                        <styled.dt fontSize="sm" color="text.secondary">
                            When
                        </styled.dt>
                        <styled.dd fontWeight="medium">{when}</styled.dd>
                    </div>
                    {location && (
                        <div>
                            <styled.dt fontSize="sm" color="text.secondary">
                                Where
                            </styled.dt>
                            <styled.dd fontWeight="medium">
                                {locationUrl ? (
                                    <AppLink
                                        to={locationUrl}
                                        unstyled
                                        color="text.highlight"
                                        textDecoration="underline"
                                        textUnderlineOffset="4px"
                                        _hover={{ color: 'brand.primary' }}
                                    >
                                        {location}
                                    </AppLink>
                                ) : (
                                    location
                                )}
                            </styled.dd>
                        </div>
                    )}
                    </styled.dl>
                    {url && !finished && (
                        <styled.p>
                            <AppLink
                                to={url}
                                unstyled
                                display="inline-block"
                                px="4"
                                py="2"
                                rounded="full"
                                fontWeight="semibold"
                                color="text.on-brand"
                                bgGradient="to-r"
                                gradientFrom="gradient.cta-mid"
                                gradientTo="gradient.cta-end"
                                _hover={{ gradientTo: 'gradient.cta-mid' }}
                            >
                                {linkLabel ?? 'Find out more'}
                            </AppLink>
                        </styled.p>
                    )}
                </Flex>

                <Box className={prose({ size: 'lg' })}>
                    <EventMarkdown tree={description} />
                </Box>
            </Box>
        </ContentPageLayout>
    )
}
