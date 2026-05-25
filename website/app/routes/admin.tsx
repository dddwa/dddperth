import { Form, Outlet, useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AppNavLink } from '~/components/app-nav-link'
import { requireAdmin } from '~/lib/auth.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin'

export async function loader({ request, context }: Route.LoaderArgs) {
    const user = await requireAdmin(request, context)
    return { user }
}

export default function AdminLayout() {
    const { user } = useLoaderData<typeof loader>()

    return (
        <Box minH="screen" bg="admin.50">
            <styled.nav bg="indigo.7" color="white" py="4" px="8" borderBottom="admin-emphasis">
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
