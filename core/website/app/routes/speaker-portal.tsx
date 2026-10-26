import { conferenceManifest } from '@conference/manifest'
import { Outlet, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { PortalShell } from '~/components/portal-shell'
import { requireSpeaker } from '~/lib/auth.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/speaker-portal'
import { noIndexMeta } from '~/lib/seo'

/**
 * Speaker portal shell. Only reachable when the fork has `speakerPortal` in
 * its manifest AND the logged-in email is a contact of an active speaker —
 * see requireSpeaker for the role rules.
 */

export async function loader({ request, context }: Route.LoaderArgs) {
    if (!conferenceManifest.speakerPortal) {
        throw new Response('Not Found', { status: 404 })
    }

    const { user, speaker } = await requireSpeaker(request, context)

    return {
        user: { email: user.email },
        speaker: { fullName: speaker.fullName },
        year: conferenceManifest.speakerPortal.year,
        conferenceName: conferenceManifest.public.name,
    }
}

/** Not indexed: the speaker portal is auth-gated and contains personal data. */
export const meta = noIndexMeta

export default function SpeakerPortalLayout() {
    const { user, speaker, year, conferenceName } = useLoaderData<typeof loader>()

    return (
        <PortalShell
            area="Speaker portal"
            homeLabel={`Visit the ${conferenceName} homepage`}
            eyebrow={`${conferenceName} ${year} speaker`}
            heading={speaker.fullName}
            email={user.email}
        >
            <Outlet />
        </PortalShell>
    )
}

export function ErrorBoundary() {
    return (
        <Flex minH="screen" align="center" justify="center" bg="admin.50">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="lg" w="full">
                <styled.h1 mb="4" fontSize="2xl" fontWeight="bold" color="admin.900">
                    Speaker portal
                </styled.h1>
                <styled.p color="admin.700">
                    Something went wrong loading your speaker workspace. Try again, or contact the organisers if it
                    keeps happening.{' '}
                    <AppLink to="/" color="admin.900" textDecoration="underline">
                        Back to the site
                    </AppLink>
                </styled.p>
            </Box>
        </Flex>
    )
}
