import { conferenceManifest } from '@conference/manifest'
import { Form, Outlet, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AppNavLink } from '~/components/app-nav-link'
import { requireSponsorContact } from '~/lib/auth.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal'

/**
 * Sponsor portal shell. Only reachable when the fork has `sponsorPortal` in
 * its manifest AND the logged-in email is a contact of an active sponsor —
 * see requireSponsorContact for the role rules.
 */

export async function loader({ request, context }: Route.LoaderArgs) {
    if (!conferenceManifest.sponsorPortal) {
        throw new Response('Not Found', { status: 404 })
    }

    const { user, sponsor } = await requireSponsorContact(request, context)

    return {
        user: { email: user.email },
        sponsor: {
            companyName: sponsor.companyName,
            tier: sponsor.tier,
        },
        year: conferenceManifest.sponsorPortal.year,
        conferenceName: conferenceManifest.public.name,
    }
}

export default function PortalLayout() {
    const { user, sponsor, year, conferenceName } = useLoaderData<typeof loader>()

    return (
        <Box minH="screen" bg="admin.50">
            <styled.nav bg="indigo.7" color="white" py="4" px="8" borderBottom="admin-emphasis">
                <Flex justify="space-between" align="center" flexWrap="wrap" gap="3">
                    <Flex align="center" gap="8">
                        <styled.h1 m="0" fontSize="xl" fontWeight="bold">
                            {conferenceName} {year} — Sponsor Portal
                        </styled.h1>
                        <Flex gap="4">
                            <AppNavLink to="/portal" variant="admin">
                                Dashboard
                            </AppNavLink>
                            <AppNavLink to="/portal/profile" variant="admin">
                                Company profile
                            </AppNavLink>
                        </Flex>
                    </Flex>
                    <Flex align="center" gap="4">
                        <Box fontSize="sm">
                            <styled.span fontWeight="semibold">{sponsor.companyName}</styled.span>
                            <styled.span
                                ml="2"
                                py="0.5"
                                px="2"
                                borderRadius="md"
                                bg="[rgba(255, 255, 255, 0.15)]"
                                fontSize="xs"
                                fontWeight="medium"
                                textTransform="uppercase"
                                letterSpacing="wide"
                            >
                                {sponsor.tier}
                            </styled.span>
                        </Box>
                        <Box fontSize="sm" opacity="0.85">
                            {user.email}
                        </Box>
                        <Form method="post" action="/auth/logout">
                            <styled.button
                                type="submit"
                                bg="transparent"
                                color="white"
                                border="[1px solid rgba(255, 255, 255, 0.3)]"
                                py="1.5"
                                px="3"
                                borderRadius="md"
                                cursor="pointer"
                                fontSize="sm"
                                _hover={{ bg: '[rgba(255, 255, 255, 0.1)]' }}
                            >
                                Logout
                            </styled.button>
                        </Form>
                    </Flex>
                </Flex>
            </styled.nav>
            <styled.main p={{ base: '4', md: '8' }}>
                <Outlet />
            </styled.main>
        </Box>
    )
}

export function ErrorBoundary() {
    return (
        <Flex minH="screen" align="center" justify="center" bg="admin.50">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[480px]" w="full">
                <styled.h1 mb="4" fontSize="2xl" fontWeight="bold" color="admin.900">
                    Sponsor portal
                </styled.h1>
                <styled.p color="admin.700">
                    Something went wrong loading your sponsor workspace. Try again, or contact the organisers if it
                    keeps happening.{' '}
                    <AppLink to="/" color="admin.900" textDecoration="underline">
                        Back to the site
                    </AppLink>
                </styled.p>
            </Box>
        </Flex>
    )
}
