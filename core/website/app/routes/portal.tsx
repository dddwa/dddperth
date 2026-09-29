import { conferenceManifest } from '@conference/manifest'
import { Form, isRouteErrorResponse, Outlet, useLoaderData, useRouteError } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AppNavLink } from '~/components/app-nav-link'
import { requireSponsorContact } from '~/lib/auth.server'
import { isNotASponsorContact } from '~/lib/sponsors/not-a-sponsor-contact'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal'
import { noIndexMeta } from '~/lib/seo'

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
        sponsorshipEmail: conferenceManifest.brand.sponsorshipEmail,
    }
}

/**
 * A prefilled subject, not a bare address.
 *
 * The portal is new this year, so the sponsorship team should hear about
 * anything that looks wrong — but an open-ended "email us" invites every
 * sponsorship question into an inbox that can't tell them apart. Naming the
 * portal in the subject keeps the ask scoped and the replies triageable.
 */
function supportMailto(email: string, companyName: string): string {
    const subject = encodeURIComponent(`Sponsor portal issue — ${companyName}`)
    return `mailto:${email}?subject=${subject}`
}

/** Not indexed: the sponsor portal is auth-gated and contains commercial data. */
export const meta = noIndexMeta

export default function PortalLayout() {
    const { user, sponsor, year, conferenceName, sponsorshipEmail } = useLoaderData<typeof loader>()

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
                            <AppNavLink to="/portal/logistics" variant="admin">
                                Event logistics
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
            <styled.footer px={{ base: '4', md: '8' }} pb="8" textAlign="center" fontSize="sm" color="admin.600">
                Got an issue with our new sponsorship portal?{' '}
                <AppLink
                    unstyled
                    to={supportMailto(sponsorshipEmail, sponsor.companyName)}
                    color="admin.900"
                    textDecoration="underline"
                >
                    Email {sponsorshipEmail}
                </AppLink>
            </styled.footer>
        </Box>
    )
}

export function ErrorBoundary() {
    const error = useRouteError()
    const unlinked = isRouteErrorResponse(error) && isNotASponsorContact(error.data) ? error.data : null

    return (
        <Flex minH="screen" align="center" justify="center" bg="admin.50">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[480px]" w="full">
                <styled.h1 mb="4" fontSize="2xl" fontWeight="bold" color="admin.900">
                    Sponsor portal
                </styled.h1>
                {unlinked ? <NotLinkedMessage email={unlinked.email} /> : <GenericErrorMessage />}
            </Box>
        </Flex>
    )
}

/**
 * A signed-in email with no active sponsor behind it. Nearly always a contact
 * who signed in with a different address from the one on the sponsor's
 * contact list, so name the address and offer both ways out: sign in again,
 * or ask to be added.
 */
function NotLinkedMessage({ email }: { email: string }) {
    const sponsorshipEmail = conferenceManifest.brand.sponsorshipEmail
    const subject = encodeURIComponent('Sponsor portal access')

    return (
        <>
            <styled.p color="admin.700" mb="4">
                You're signed in as <styled.strong color="admin.900">{email}</styled.strong>, which isn't linked to a
                sponsor. If your company sponsors us, you may have signed in with a different email from the one we
                have on file.
            </styled.p>
            <styled.p color="admin.700" mb="6">
                Sign in with that address instead, or email{' '}
                <AppLink
                    unstyled
                    to={`mailto:${sponsorshipEmail}?subject=${subject}`}
                    color="admin.900"
                    textDecoration="underline"
                >
                    {sponsorshipEmail}
                </AppLink>{' '}
                to get this one added.
            </styled.p>
            <Flex justify="center" align="center" gap="4" flexWrap="wrap">
                <Form method="post" action="/auth/logout">
                    <input type="hidden" name="redirectTo" value="/auth/login?redirectTo=%2Fportal" />
                    <styled.button
                        type="submit"
                        bg="indigo.7"
                        color="white"
                        border="none"
                        py="2"
                        px="4"
                        borderRadius="md"
                        cursor="pointer"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{ bg: 'indigo.8' }}
                    >
                        Sign in with a different email
                    </styled.button>
                </Form>
                <AppLink unstyled to="/" color="admin.900" textDecoration="underline" fontSize="sm">
                    Back to the site
                </AppLink>
            </Flex>
        </>
    )
}

function GenericErrorMessage() {
    return (
        <styled.p color="admin.700">
            Something went wrong loading your sponsor workspace. Try again, or contact the organisers if it keeps
            happening.{' '}
            <AppLink to="/" color="admin.900" textDecoration="underline">
                Back to the site
            </AppLink>
        </styled.p>
    )
}
