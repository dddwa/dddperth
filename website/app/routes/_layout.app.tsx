// Renders a mobile-app download page when the fork's manifest has
// `mobileApp` set (iOS + Android store URLs). Forks without a mobile app
// get a 404 here — the route never tells visitors to download something
// that doesn't exist.
//
// The page copy is intentionally generic ("the official conference app");
// if a fork has app-specific marketing copy, the right place for it is an
// MDX page under conference/content/pages/, not this layout component.

import type { HeadersFunction } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { ContentPageLayout } from '~/components/page-layout'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.app'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export function loader() {
    const mobileApp = conferenceManifest.mobileApp
    if (!mobileApp) {
        // No app for this fork — pretend the route doesn't exist.
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    // Loader-returned values are serialised, so we only ship the URL strings
    // the page needs. (Bundle IDs are only consumed by /app-config.)
    return { iosUrl: mobileApp.iosUrl, androidUrl: mobileApp.androidUrl }
}

const conferenceName = conferenceManifest.public.name

export function meta() {
    return [
        { title: `Download the ${conferenceName} App | ${conferenceName}` },
        {
            name: 'description',
            content: `Get the official ${conferenceName} conference app for iOS and Android to access the agenda, speaker info, venue maps, and real-time updates during the conference.`,
        },
    ]
}

export default function AppDownloadPage({ loaderData }: Route.ComponentProps) {
    const { iosUrl, androidUrl } = loaderData
    return (
        <ContentPageLayout>
            <styled.main id="content" marginX={{ base: '6', lg: '0' }}>
                <styled.div display="flex" flexDirection="column" alignItems="center" gap="8" py="8">
                    <styled.div textAlign="center" maxW="3xl" mb="4">
                        <styled.h1 fontSize="3xl" fontWeight="bold" mb="6">
                            Download the {conferenceName} App
                        </styled.h1>

                        <styled.p fontSize="lg" mb="6">
                            The official {conferenceName} app is your essential companion for the conference. Get
                            instant access to the full agenda, speaker profiles, venue maps, and real-time announcements
                            — all in the palm of your hand.
                        </styled.p>
                    </styled.div>

                    <styled.div
                        display="flex"
                        flexDirection={{ base: 'column', md: 'row' }}
                        gap="4"
                        alignItems="center"
                        justifyContent="center"
                    >
                        <styled.a
                            href={iosUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            display="inline-flex"
                            transition="transform"
                            _hover={{ transform: 'scale(1.05)' }}
                        >
                            <styled.img
                                src="/images/get-app-store.svg"
                                alt="Download on the App Store"
                                height={{ base: '[48px]', md: '[56px]' }}
                                width="[200px]"
                                objectFit="contain"
                            />
                        </styled.a>

                        <styled.a
                            href={androidUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            display="inline-flex"
                            transition="transform"
                            _hover={{ transform: 'scale(1.05)' }}
                        >
                            <styled.img
                                src="/images/get-google-play.png"
                                alt="Get it on Google Play"
                                height={{ base: '[48px]', md: '[56px]' }}
                                width="[200px]"
                                objectFit="contain"
                            />
                        </styled.a>
                    </styled.div>

                    <styled.a
                        href="/agenda"
                        display="inline-flex"
                        transition="transform"
                        _hover={{ transform: 'scale(1.05)' }}
                        textDecoration="underline"
                    >
                        View Agenda on Website
                    </styled.a>

                    <Box p="6" bgColor="status.info.bg" borderRadius="lg" textAlign="center" maxW="2xl">
                        <styled.h3 fontSize="lg" fontWeight="semibold" mb="2" color="status.info.fg">
                            Pro Tip
                        </styled.h3>
                        <styled.p color="status.info.fg">
                            Download the app before conference day to familiarize yourself with the agenda and plan
                            which sessions you want to attend. Enable notifications to stay updated with any last-minute
                            changes!
                        </styled.p>
                    </Box>
                </styled.div>
            </styled.main>
        </ContentPageLayout>
    )
}
