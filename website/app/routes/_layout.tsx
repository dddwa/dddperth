import { DateTime } from 'luxon'
import { Outlet, useLoaderData } from 'react-router'
import { Acknowledgement } from '~/components/acknowledgement'
import { AdminOverlay } from '~/components/admin-overlay'
import { ErrorPage } from '~/components/error-page'
import { Footer } from '~/components/footer/footer'
import { Header } from '~/components/header/header'
import { ContentPageLayout } from '~/components/page-layout'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { getUser, isAdmin } from '~/lib/auth.server'
import { WEB_URL } from '~/lib/config.server' // Ensure this path is correct
import { adminDateTimeSessionStorage } from '~/lib/session.server'
import type { Route } from './+types/_layout'

export async function loader({ context, request }: Route.LoaderArgs) {
    const user = await getUser(request.headers)
    let adminData = null

    if (user && isAdmin(user)) {
        const session = await adminDateTimeSessionStorage.getSession(request.headers.get('cookie'))
        const overrideDate = session.get('adminDateOverride')

        adminData = {
            user: {
                login: user.login,
                avatarUrl: user.avatarUrl,
            },
            overrideDate: overrideDate || null,
            currentDate: DateTime.local({ zone: conferenceConfigPublic.timezone }).toISO(),
            timezone: conferenceConfigPublic.timezone,
        }
    }

    return {
        conferenceDescription: conferenceConfigPublic.description,
        conferenceState: context.conferenceState,
        webUrl: WEB_URL,
        adminData,
    }
}

export function meta({ data, location }: Route.MetaArgs) {
    const title = data?.conferenceState.conference.date
        ? `${conferenceConfigPublic.name} | ${DateTime.fromISO(data.conferenceState.conference.date).toLocaleString(
              DateTime.DATE_HUGE,
              {
                  locale: 'en-AU',
              },
          )}`
        : conferenceConfigPublic.name

    const description = data.conferenceDescription
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

export default function Index() {
    const { conferenceDescription, conferenceState, webUrl, adminData } = useLoaderData<typeof loader>()
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
            {adminData && (
                <AdminOverlay
                    user={adminData.user}
                    overrideDate={adminData.overrideDate}
                    currentDate={adminData.currentDate}
                    timezone={adminData.timezone}
                />
            )}
            <Header
                cfpOpen={conferenceState.callForPapers.state === 'open'}
                votingOpen={conferenceState.talkVoting.state === 'open'}
                ticketSalesOpen={conferenceState.ticketSales.state === 'open'}
            />

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
                            description: conferenceDescription,
                            organizer: {
                                '@type': 'Organization',
                                name: conferenceConfigPublic.name,
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
            <Header cfpOpen={false} votingOpen={false} ticketSalesOpen={false} />

            <ContentPageLayout>
                <ErrorPage />
            </ContentPageLayout>
            <Footer />
            <Acknowledgement />
        </div>
    )
}
