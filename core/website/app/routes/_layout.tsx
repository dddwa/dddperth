import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
import { Outlet, useLoaderData } from 'react-router'
import { Acknowledgement } from '~/components/acknowledgement'
import { AdminOverlay } from '~/components/admin-overlay'
import { ErrorPage } from '~/components/error-page'
import { Footer } from '~/components/footer/footer'
import { Header } from '~/components/header/header'
import { ContentPageLayout } from '~/components/page-layout'
import { getUser, isAdmin } from '~/lib/auth.server'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'
import type { Route } from './+types/_layout'

export async function loader({ context, request }: Route.LoaderArgs) {
    const user = await getUser(request.headers, getServices(context))
    let adminData = null

    if (user && isAdmin(user)) {
        const session = await getServices(context).sessions.adminDateTime.getSession(request.headers.get('cookie'))
        const overrideDate = session.get('adminDateOverride')

        adminData = {
            user: {
                email: user.email,
                name: user.name,
            },
            overrideDate: overrideDate || null,
            currentDate: DateTime.local({ zone: conferenceManifest.public.timezone }).toISO(),
            timezone: conferenceManifest.public.timezone,
        }
    }

    return {
        conferenceDescription: conferenceManifest.public.description,
        conferenceState: getConferenceState(context),
        webUrl: getConfig(context).webUrl,
        adminData,
    }
}

export function meta({ loaderData: data, location }: Route.MetaArgs) {
    const title = data?.conferenceState.conference.date
        ? `${conferenceManifest.public.name} | ${DateTime.fromISO(data.conferenceState.conference.date, {
              zone: conferenceManifest.public.timezone,
          }).toLocaleString(DateTime.DATE_HUGE, {
              locale: 'en-AU',
          })}`
        : conferenceManifest.public.name

    const description = data?.conferenceDescription
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
                venue={conferenceState.conference.venue}
            />

            {venue && (
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            '@context': 'https://schema.org',
                            '@type': 'Event',
                            name: `${conferenceManifest.public.name} ${conference.year}`,
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
                                name: conferenceManifest.public.name,
                                url: webUrl,
                            },
                        }),
                    }}
                />
            )}
            <Outlet />
            <Footer />
            <Acknowledgement conferenceState={conferenceState} />
        </div>
    )
}

export function ErrorBoundary() {
    return (
        <div>
            <Header cfpOpen={false} votingOpen={false} ticketSalesOpen={false} venue={undefined} />

            <ContentPageLayout>
                <ErrorPage />
            </ContentPageLayout>
            <Footer />
            <Acknowledgement />
        </div>
    )
}
