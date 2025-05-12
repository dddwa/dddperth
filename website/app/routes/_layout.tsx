import { DateTime } from 'luxon'
import type { MetaFunction } from 'react-router'
import { Outlet } from 'react-router'
import { ErrorPage } from '~/components/error-page'
import { Box, Flex } from '~/styled-system/jsx'
import { Acknowledgement } from '../components/acknowledgement'
import { Footer } from '../components/footer/footer'
import { Header } from '../components/header/header'
import { conferenceConfig } from '../config/conference-config'
import { WEB_URL } from '../lib/config.server' // Ensure this path is correct
import type { Route } from './+types/_layout'

export function loader({ context }: Route.LoaderArgs) {
    return {
        conferenceState: context.conferenceState,
        webUrl: WEB_URL,
    }
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
    const title = data?.conferenceState.conference.date
        ? `${conferenceConfig.name} | ${DateTime.fromISO(data.conferenceState.conference.date).toLocaleString(
              DateTime.DATE_HUGE,
              {
                  locale: 'en-AU',
              },
          )}`
        : conferenceConfig.name

    const description = conferenceConfig.description
    const url = `${data?.webUrl ?? ''}${location.pathname}`

    return [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: url },
        { property: 'og:image', content: `${data?.webUrl ?? ''}/images/logo.png` },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: `${data?.webUrl ?? ''}/images/logo.png` },
        { name: 'keywords', content: 'DDD, Perth, Conference, Software Development, Programming, Tech' },
        { rel: 'canonical', href: url },
    ]
}

import { useLoaderData } from 'react-router'

export default function Index() {
    const { conferenceState, webUrl } = useLoaderData<typeof loader>()
    const conference = conferenceState.conference
    const venue = conference.venue

    // Infer eventStatus for JSON-LD from conferenceState.conferenceState
    let eventStatus = 'https://schema.org/EventScheduled'
    switch (conferenceState.conferenceState) {
        case 'before-conference':
        case 'week-before-conference':
            eventStatus = 'https://schema.org/EventScheduled'
            break
        case 'conference-day':
            eventStatus = 'https://schema.org/EventInProgress'
            break
        case 'conference-over':
            eventStatus = 'https://schema.org/EventCompleted'
            break
        default:
            eventStatus = 'https://schema.org/EventCompleted'
    }

    return (
        <div>
            <Header />
            {venue && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Event',
                            name: `DDD Perth ${conference.year}`,
                            startDate: conference.date ?? '',
                            endDate: conference.date ?? '',
                            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                            eventStatus,
                            location: {
                                '@type': 'Place',
                                name: venue.name,
                                address: {
                                    '@type': 'PostalAddress',
                                    ...venue.address,
                                },
                                geo: {
                                    '@type': 'GeoCoordinates',
                                    latitude: venue.latitude,
                                    longitude: venue.longitude,
                                },
                            },
                            image: [`${webUrl}/favicon.svg`],
                            description: conferenceConfig.description,
                            organizer: {
                                '@type': 'Organization',
                                name: conferenceConfig.name,
                                url: webUrl,
                            },
                        }),
                    }}
                />
            )}
            <Outlet />
            <Footer />
            <Acknowledgement />
        </div>
    )
}

export function ErrorBoundary() {
    return (
        <div>
            <Header />
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
                    <ErrorPage />
                </Box>
            </Flex>
            <Footer />
            <Acknowledgement />
        </div>
    )
}
