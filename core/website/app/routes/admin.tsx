import { Portal } from '@ark-ui/react/portal'
import { useEffect, useState } from 'react'
import { Form, isRouteErrorResponse, NavLink, Outlet, useLoaderData, useLocation, useRouteError } from 'react-router'
import { AppLink } from '~/components/app-link'
import * as Drawer from '~/components/ui/drawer'
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

/**
 * The admin sections, grouped. Order here is the order in the sidebar. Add a
 * new admin page here and it appears in both the desktop sidebar and the
 * mobile menu.
 */
const ADMIN_NAV: Array<{ heading?: string; links: Array<{ to: string; label: string }> }> = [
    { links: [{ to: '/admin/dashboard', label: 'Dashboard' }] },
    {
        heading: 'Conference',
        links: [
            { to: '/admin/voting', label: 'Voting' },
            { to: '/admin/agenda-shortlist', label: 'Shortlist' },
            { to: '/admin/content', label: 'Content' },
            { to: '/admin/feedback', label: 'Feedback' },
        ],
    },
    {
        heading: 'People',
        links: [
            { to: '/admin/sponsors', label: 'Sponsors' },
            { to: '/admin/speakers', label: 'Speakers' },
            { to: '/admin/volunteers', label: 'Volunteers' },
        ],
    },
    { links: [{ to: '/admin/settings', label: 'Settings' }] },
]

/** Solid and token-only, so it stays visible on the dark sidebar (the `focus-ring` shadow is too faint there). */
const focusOutline = {
    outlineStyle: 'solid',
    outlineWidth: 'medium',
    outlineColor: 'white',
    outlineOffset: '0.5',
} as const

/**
 * Sidebar from `lg` up, a top bar with a menu drawer below it. A horizontal bar
 * ran out of room once there were nine sections, and wrapped the user's name
 * and "Back to Site" into a column.
 */
export default function AdminLayout() {
    const { user } = useLoaderData<typeof loader>()
    const [menuOpen, setMenuOpen] = useState(false)
    const { pathname } = useLocation()

    // Close the drawer on any navigation, including the browser's back button.
    useEffect(() => setMenuOpen(false), [pathname])

    return (
        <Box minH="screen" bg="admin.50" lg={{ display: 'flex', alignItems: 'flex-start' }}>
            <Flex
                display={{ base: 'flex', lg: 'none' }}
                align="center"
                justify="space-between"
                gap="4"
                bg="indigo.9"
                color="white"
                px="4"
                py="3"
            >
                <AdminBrand />
                <styled.button
                    type="button"
                    onClick={() => setMenuOpen(true)}
                    aria-expanded={menuOpen}
                    display="inline-flex"
                    alignItems="center"
                    gap="2"
                    px="3"
                    py="2"
                    rounded="md"
                    bg="transparent"
                    color="white"
                    border="none"
                    cursor="pointer"
                    fontSize="sm"
                    fontWeight="medium"
                    _hover={{ bg: 'indigo.10' }}
                    _focusVisible={focusOutline}
                >
                    <MenuIcon />
                    Menu
                </styled.button>
            </Flex>

            <styled.aside
                display={{ base: 'none', lg: 'flex' }}
                flexDirection="column"
                position="sticky"
                top="0"
                flexShrink="0"
                w="60"
                h="dvh"
                overflowY="auto"
                bg="indigo.9"
                color="white"
                px="4"
                py="6"
            >
                <Box px="3" mb="6">
                    <AdminBrand />
                </Box>
                <AdminNavContent user={user} label="Admin" />
            </styled.aside>

            <Drawer.Root open={menuOpen} onOpenChange={(e) => setMenuOpen(e.open)}>
                <Portal>
                    <Drawer.Backdrop position="fixed" inset="0" bg="overlay.scrim" zIndex="overlay" />
                    <Drawer.Positioner position="fixed" top="0" left="0" h="dvh" w="72" maxW="full" zIndex="modal">
                        <Drawer.Content
                            display="flex"
                            flexDirection="column"
                            h="full"
                            overflowY="auto"
                            bg="indigo.9"
                            color="white"
                            px="4"
                            py="4"
                            boxShadow="lg"
                        >
                            <Flex align="center" justify="space-between" px="3" mb="4">
                                <Drawer.Title fontSize="lg" fontWeight="bold">
                                    DDD Admin
                                </Drawer.Title>
                                <Drawer.CloseTrigger
                                    aria-label="Close menu"
                                    display="inline-flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    w="10"
                                    h="10"
                                    rounded="md"
                                    bg="transparent"
                                    color="white"
                                    border="none"
                                    cursor="pointer"
                                    _hover={{ bg: 'indigo.10' }}
                                    _focusVisible={focusOutline}
                                >
                                    <CloseIcon />
                                </Drawer.CloseTrigger>
                            </Flex>
                            <AdminNavContent user={user} label="Admin (menu)" />
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>

            <styled.main flex="1" minW="0" lg={{ p: '6' }}>
                <Outlet />
            </styled.main>
        </Box>
    )
}

function AdminBrand() {
    return (
        <AppLink to="/admin" unstyled color="white" textDecoration="none" _focusVisible={focusOutline}>
            <styled.span fontSize="xl" fontWeight="bold">
                DDD Admin
            </styled.span>
        </AppLink>
    )
}

function AdminNavContent({ user, label }: { user: { name: string | null; email: string }; label: string }) {
    return (
        <>
            <styled.nav aria-label={label} flex="1">
                {ADMIN_NAV.map((group, i) => (
                    <Box key={group.heading ?? i} mb="4">
                        {group.heading ? (
                            <styled.p
                                px="3"
                                mb="1"
                                fontSize="xs"
                                fontWeight="semibold"
                                textTransform="uppercase"
                                letterSpacing="wider"
                                color="white"
                            >
                                {group.heading}
                            </styled.p>
                        ) : null}
                        <styled.ul listStyle="none" display="flex" flexDirection="column" gap="1">
                            {group.links.map((link) => (
                                <li key={link.to}>
                                    <SidebarLink to={link.to}>{link.label}</SidebarLink>
                                </li>
                            ))}
                        </styled.ul>
                    </Box>
                ))}
            </styled.nav>
            <Flex direction="column" gap="3" px="3" pt="4" borderTop="subtle" fontSize="sm">
                <styled.span color="white" fontWeight="semibold" wordBreak="break-word">
                    {user.name || user.email}
                </styled.span>
                <AppLink to="/" unstyled color="white" textDecoration="underline" _focusVisible={focusOutline}>
                    ← Back to site
                </AppLink>
                <Form method="post" action="/auth/logout">
                    <styled.button
                        type="submit"
                        bg="transparent"
                        color="white"
                        border="none"
                        p="0"
                        textDecoration="underline"
                        cursor="pointer"
                        fontSize="sm"
                        _focusVisible={focusOutline}
                    >
                        Log out
                    </styled.button>
                </Form>
            </Flex>
        </>
    )
}

const StyledNavLink = styled(NavLink)

/** `NavLink` sets `aria-current="page"` on the section you're in, which `_currentPage` styles. */
function SidebarLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <StyledNavLink
            to={to}
            display="block"
            px="3"
            py="2"
            rounded="md"
            color="white"
            fontWeight="medium"
            textDecoration="none"
            _hover={{ bg: 'indigo.10' }}
            // `indigo.900` is a fixed shade; the `indigo.1`-`12` steps flip with the
            // site theme, and in dark mode `indigo.11` is a pale blue on this white.
            _currentPage={{ bg: 'white', color: 'indigo.900', fontWeight: 'semibold' }}
            _focusVisible={focusOutline}
        >
            {children}
        </StyledNavLink>
    )
}

function MenuIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
    )
}

function CloseIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
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
