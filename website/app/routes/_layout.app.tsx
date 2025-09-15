import type { HeadersFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import { ContentPageLayout } from '~/components/page-layout'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.app'

export const headers: HeadersFunction = () => {
    return { 'Cache-Control': CACHE_CONTROL.DEFAULT }
}

export async function loader({ context }: Route.LoaderArgs) {
    return data(
        {
            conferenceState: context.conferenceState,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.conf } },
    )
}

export function meta() {
    return [
        { title: 'Download the DDD Perth App | DDD Perth' },
        {
            name: 'description',
            content:
                'Get the official DDD Perth conference app for iOS and Android to access the agenda, speaker info, venue maps, and real-time updates during the conference.',
        },
    ]
}

export default function AppDownloadPage() {
    const { conferenceState } = useLoaderData<typeof loader>()

    return (
        <ContentPageLayout>
            <styled.main id="content" marginX={{ base: 6, lg: 0 }}>
                <styled.div display="flex" flexDirection="column" alignItems="center" gap={8} py={8}>
                    <styled.div textAlign="center" maxW="3xl" mb={4}>
                        <styled.h1 fontSize="3xl" fontWeight="bold" mb={6}>
                            Download the DDD Perth App
                        </styled.h1>

                        <styled.p fontSize="lg" mb={6}>
                            The official DDD Perth app is your essential companion for the conference. Get instant
                            access to the full agenda, speaker profiles, venue maps, and real-time announcements - all
                            in the palm of your hand.
                        </styled.p>
                    </styled.div>

                    <styled.div
                        display="flex"
                        flexDirection={{ base: 'column', md: 'row' }}
                        gap={4}
                        alignItems="center"
                        justifyContent="center"
                    >
                        <styled.a
                            href="https://apps.apple.com/au/app/ddd-perth/id6670743492"
                            target="_blank"
                            rel="noopener noreferrer"
                            display="inline-flex"
                            transition="transform 0.2s"
                            _hover={{ transform: 'scale(1.05)' }}
                        >
                            <styled.img
                                src="/images/get-app-store.svg"
                                alt="Download on the App Store"
                                height={{ base: '48px', md: '56px' }}
                                width="200px"
                                objectFit="contain"
                            />
                        </styled.a>

                        <styled.a
                            href="https://play.google.com/store/apps/details?id=com.dddperth.conference&hl=en_AU"
                            target="_blank"
                            rel="noopener noreferrer"
                            display="inline-flex"
                            transition="transform 0.2s"
                            _hover={{ transform: 'scale(1.05)' }}
                        >
                            <styled.img
                                src="/images/get-google-play.png"
                                alt="Get it on Google Play"
                                height={{ base: '48px', md: '56px' }}
                                width="200px"
                                objectFit="contain"
                            />
                        </styled.a>
                    </styled.div>

                    <styled.a
                        href="/agenda"
                        display="inline-flex"
                        transition="transform 0.2s"
                        _hover={{ transform: 'scale(1.05)' }}
                        textDecoration="underline"
                    >
                        View Agenda on Website
                    </styled.a>

                    <Box p={6} bgColor="blue.50" borderRadius="lg" textAlign="center" maxW="2xl">
                        <styled.h3 fontSize="lg" fontWeight="semibold" mb={2} color="blue.900">
                            Pro Tip
                        </styled.h3>
                        <styled.p color="blue.800">
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
