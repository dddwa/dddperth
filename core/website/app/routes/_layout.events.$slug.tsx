import { conferenceManifest } from '@conference/manifest'
import { data, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { ContentPageLayout } from '~/components/page-layout'
import { calendarEventDetails, googleCalendarUrl, outlookCalendarUrl } from '~/lib/events/event-calendar'
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
    const siteOrigin = `https://${conferenceManifest.brand.domain}`
    const summary = eventSummary(description)
    const calendar = calendarEventDetails(event, { siteOrigin, summary: eventSummary(description, 500) })

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
            summary,
            canonicalUrl: calendar.pageUrl,
            addToCalendar: {
                ics: `/events/${event.slug}/calendar.ics`,
                google: googleCalendarUrl(calendar),
                outlook: outlookCalendarUrl(calendar, 'personal'),
                office365: outlookCalendarUrl(calendar, 'work'),
            },
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
    const { title, when, finished, location, locationUrl, url, linkLabel, description, addToCalendar } =
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
                    {!finished && <AddToCalendar links={addToCalendar} />}
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

const calendarLink = {
    unstyled: true,
    display: 'inline-block',
    px: '3',
    py: '1',
    rounded: 'full',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'text.highlight',
    border: 'default',
    _hover: { color: 'brand.primary', borderColor: 'brand.primary' },
} as const

/**
 * A file for Apple Calendar, desktop Outlook and anything else that opens
 * `.ics`, plus compose links for the web calendars, which can't open a file
 * straight from a download.
 */
function AddToCalendar({ links }: { links: { ics: string; google: string; outlook: string; office365: string } }) {
    return (
        <styled.div role="group" aria-labelledby="add-to-calendar">
            <styled.p id="add-to-calendar" fontSize="sm" color="text.secondary" mb="2">
                Add to calendar
            </styled.p>
            <styled.ul display="flex" gap="2" flexWrap="wrap" listStyle="none">
                <li>
                    <AppLink to={links.ics} download {...calendarLink}>
                        Apple / other (.ics)
                    </AppLink>
                </li>
                <li>
                    <AppLink to={links.google} {...calendarLink}>
                        Google Calendar
                    </AppLink>
                </li>
                <li>
                    <AppLink to={links.outlook} {...calendarLink}>
                        Outlook.com
                    </AppLink>
                </li>
                <li>
                    <AppLink to={links.office365} {...calendarLink}>
                        Microsoft 365
                    </AppLink>
                </li>
            </styled.ul>
        </styled.div>
    )
}
