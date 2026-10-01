import { Form, isRouteErrorResponse, Outlet, useLoaderData, useRouteError } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AppNavLink } from '~/components/app-nav-link'
import { requireAdmin } from '~/lib/auth.server'
import { isNotAnAdmin } from '~/lib/auth/not-an-admin'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin'
import { noIndexMeta } from '~/lib/seo'

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAdmin(request, context)
    return { user }
}

/** Not indexed: the admin area is auth-gated; every URL under it redirects to login. */
export const meta = noIndexMeta

export default function AdminLayout() {
    const { user } = useLoaderData<typeof loader>()

    return (
        <Box minH="screen" bg="admin.50">
            <styled.nav bg="indigo.9" color="white" py="4" px="8" borderBottom="admin-emphasis">
                <Flex justify="space-between" align="center">
                    <Flex align="center" gap="8">
                        <AppLink to="/" color="white" textDecoration="none">
                            <styled.h1 m="0" fontSize="xl" fontWeight="bold">
                                DDD Admin
                            </styled.h1>
                        </AppLink>
                        <Flex gap="4">
                            <AppNavLink to="/admin/dashboard" variant="admin">
                                Dashboard
                            </AppNavLink>
                            <AppNavLink to="/admin/voting" variant="admin">
                                Voting
                            </AppNavLink>
                            <AppNavLink to="/admin/content" variant="admin">
                                Content
                            </AppNavLink>
                            <AppNavLink to="/admin/sponsors" variant="admin">
                                Sponsors
                            </AppNavLink>
                            <AppNavLink to="/admin/speakers" variant="admin">
                                Speakers
                            </AppNavLink>
                            <AppNavLink to="/admin/volunteers" variant="admin">
                                Volunteers
                            </AppNavLink>
                            <AppNavLink to="/admin/agenda-shortlist" variant="admin">
                                Shortlist
                            </AppNavLink>
                            <AppNavLink to="/admin/settings" variant="admin">
                                Settings
                            </AppNavLink>
                        </Flex>
                    </Flex>
                    <Flex align="center" gap="4">
                        <AppLink
                            to="/"
                            color="white"
                            textDecoration="none"
                            py="1.5"
                            px="3"
                            borderRadius="md"
                            border="[1px solid rgba(255, 255, 255, 0.3)]"
                            fontSize="sm"
                            transition="colors"
                            _hover={{ bg: '[rgba(255, 255, 255, 0.1)]' }}
                        >
                            ← Back to Site
                        </AppLink>
                        <Box fontSize="sm">{user.name || user.email}</Box>
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
            <styled.main>
                <Outlet />
            </styled.main>
        </Box>
    )
}

export function ErrorBoundary() {
    const error = useRouteError()
    const notAdmin = isRouteErrorResponse(error) && isNotAnAdmin(error.data) ? error.data : null

    return (
        <Flex minH="screen" align="center" justify="center" bg="admin.50">
            <Box bg="white" p="8" borderRadius="lg" boxShadow="lg" textAlign="center" maxW="[480px]" w="full">
                <styled.h1 mb="4" fontSize="2xl" fontWeight="bold" color="admin.900">
                    DDD Admin
                </styled.h1>
                {notAdmin ? <NoAccessMessage email={notAdmin.email} /> : <GenericErrorMessage />}
            </Box>
        </Flex>
    )
}

function NoAccessMessage({ email }: { email: string }) {
    return (
        <>
            <styled.p color="admin.700" mb="6">
                You're signed in as <styled.strong color="admin.900">{email}</styled.strong>, which doesn't have admin
                access. Sign in with a different email, or ask an existing admin to add this one.
            </styled.p>
            <Flex justify="center" align="center" gap="4" flexWrap="wrap">
                <Form method="post" action="/auth/logout">
                    <input type="hidden" name="redirectTo" value="/auth/login?redirectTo=%2Fadmin" />
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
            Something went wrong loading the admin area. Try again, or check the worker logs if it keeps happening.{' '}
            <AppLink to="/" color="admin.900" textDecoration="underline">
                Back to the site
            </AppLink>
        </styled.p>
    )
}
