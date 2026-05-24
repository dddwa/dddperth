import { Portal } from '@ark-ui/react/portal'
import { useState } from 'react'
import { useRouteLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { conferenceManifest } from '@conference/manifest'
import Logo from '~/images/svg/logo.svg?react'
import type { ConferenceVenue } from '~/lib/conference-state-client-safe'
import type { Theme } from '~/lib/theme.server'
import type { loader as rootLoader } from '~/root'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import { AppLink } from '../app-link'
import { HeaderContainer } from '../page-layout'
import { ThemeToggle } from '../theme-toggle'
import * as Drawer from '../ui/drawer'

interface NavItem {
    to: string
    label: string
}

export function Header({
    cfpOpen,
    votingOpen,
    ticketSalesOpen,
    venue,
}: {
    cfpOpen: boolean
    votingOpen: boolean
    ticketSalesOpen: boolean
    venue: ConferenceVenue | undefined
}) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const rootData = useRouteLoaderData<typeof rootLoader>('root')
    const theme: Theme = rootData?.theme ?? 'dark'

    const navItems: NavItem[] = [
        { to: '/sponsorship', label: 'Sponsorship' },
        { to: '/sponsors', label: 'Sponsors' },
        { to: '/agenda', label: 'Agenda' },
        ...(venue ? [{ to: '/venue', label: 'Venue' }] : []),
        { to: '/about', label: 'About' },
    ]

    // CTA layout:
    // - During voting: Vote is the only CTA (most urgent action)
    // - Otherwise: secondary square buttons left of a primary pill
    //   Primary pill is the rightmost. Order: [Propose Talk] [Buy Tickets→]
    const ctas: { to: string; label: string }[] = votingOpen
        ? [{ to: $path('/voting'), label: 'Vote!' }]
        : [
              ...(cfpOpen ? [{ to: '/call-for-presentations', label: 'Propose a Talk' }] : []),
              ...(ticketSalesOpen ? [{ to: '/tickets', label: 'Buy Tickets' }] : []),
          ]

    return (
        <styled.header position="relative" bgColor="surface.header" w="full" display="flex" zIndex="banner" py="4">
            <HeaderContainer>
                <Grid
                    gridTemplateAreas={{
                        base: '"menu logo cta"',
                        lg: '"logo nav cta"',
                    }}
                    gridTemplateColumns={{
                        base: 'auto 1fr auto',
                        lg: 'auto 1fr auto',
                    }}
                    gap={{ base: '3', lg: '4' }}
                    alignItems="center"
                >
                    {/* Hamburger (mobile/tablet only) */}
                    <Box gridArea="menu" display={{ base: 'flex', lg: 'none' }}>
                        <MenuButton
                            onClick={() => setDrawerOpen(true)}
                            aria-label="Open navigation menu"
                            aria-expanded={drawerOpen}
                        />
                    </Box>

                    {/* Logo */}
                    <Box gridArea="logo">
                        <AppLink
                            aria-label={`Visit the ${conferenceManifest.public.name} homepage`}
                            to={`/`}
                            // PERTH letters inside the logo use `currentColor` so the
                            // wordmark adapts to the header surface (white on dark
                            // body, dark indigo on light body).
                            color="text.primary"
                            display="flex"
                            justifyContent={{ base: 'center', lg: 'flex-start' }}
                            alignItems="center"
                            width={{ base: '[110px]', lg: '[180px]' }}
                        >
                            <Logo />
                        </AppLink>
                    </Box>

                    {/* Desktop Navigation */}
                    <Flex
                        gridArea="nav"
                        display={{ base: 'none', lg: 'flex' }}
                        alignItems="center"
                        justifyContent="center"
                        gap="12"
                        fontSize="md"
                        fontWeight="semibold"
                    >
                        {navItems.map((item) => (
                            // `chrome` variant uses `text.primary` so nav adapts to
                            // the header surface in both themes (header now blends
                            // into the body in light mode).
                            <AppLink key={item.to} to={item.to} variant="chrome">
                                {item.label}
                            </AppLink>
                        ))}
                    </Flex>

                    {/* CTAs — rightmost is the primary pill, others are square */}
                    {/* Below 460px, secondaries hide; only the primary pill stays in the header */}
                    <Flex gridArea="cta" justifyContent="flex-end" alignItems="center" gap="2">
                        <ThemeToggle initialTheme={theme} />
                        {ctas.map((cta, i) => {
                            const isPrimary = i === ctas.length - 1
                            return isPrimary ? (
                                <CtaPillLink key={cta.to} to={cta.to} label={cta.label} />
                            ) : (
                                <Box
                                    key={cta.to}
                                    display="none"
                                    css={{ '@media (min-width: 460px)': { display: 'block' } }}
                                >
                                    <CtaSquareLink to={cta.to} label={cta.label} />
                                </Box>
                            )
                        })}
                    </Flex>
                </Grid>
            </HeaderContainer>

            {/* Mobile drawer */}
            <Drawer.Root open={drawerOpen} onOpenChange={(e) => setDrawerOpen(e.open)}>
                <Portal>
                    {/*
                     * Drawer surface styles are inlined rather than coming from a
                     * Panda slot recipe — the project used to consume @park-ui/panda-
                     * preset's `drawer` recipe, but Park UI 1.0 ships only `dialog`,
                     * which has a different layout contract. The mobile menu is the
                     * sole drawer surface, so keeping styles co-located is simpler
                     * than reintroducing a one-call-site recipe.
                     */}
                    <Drawer.Backdrop
                        bgColor="overlay.scrim"
                        position="fixed"
                        inset="0"
                        height="[100vh]"
                        width="[100vw]"
                        zIndex="overlay"
                        backdropFilter="[blur(4px)]"
                    />
                    <Drawer.Positioner
                        position="fixed"
                        top="0"
                        left="0"
                        height="[100dvh]"
                        width="[100vw]"
                        maxWidth="[320px]"
                        zIndex="modal"
                    >
                        <Drawer.Content
                            // Drawer panel keeps a brand-dark surface in both themes
                            // (header + footer both blend into the body in light mode,
                            // but a drawer overlay needs to read cleanly against any
                            // underlying surface, so it uses its own token).
                            bgColor="surface.drawer"
                            color="text.on-brand"
                            display="flex"
                            flexDirection="column"
                            height="full"
                            width="full"
                            boxShadow="lg"
                        >
                            <Flex
                                alignItems="center"
                                justifyContent="space-between"
                                px="5"
                                py="4"
                                borderBottom="[1px solid token(colors.border.subtle)]"
                            >
                                <Drawer.Title color="text.on-brand" fontSize="lg" fontWeight="semibold">
                                    Menu
                                </Drawer.Title>
                                <Drawer.CloseTrigger
                                    aria-label="Close navigation menu"
                                    display="inline-flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    w="10"
                                    h="10"
                                    color="text.on-brand"
                                    bgColor="transparent"
                                    border="none"
                                    cursor="pointer"
                                    borderRadius="md"
                                    _hover={{ bgColor: 'overlay.subtle' }}
                                >
                                    <CloseIcon />
                                </Drawer.CloseTrigger>
                            </Flex>
                            {ctas.length > 0 ? (
                                <Flex
                                    direction="column"
                                    gap="3"
                                    px="5"
                                    py="5"
                                    borderBottom="[1px solid token(colors.border.subtle)]"
                                >
                                    {ctas.map((cta) => (
                                        <CtaSquareLink
                                            key={cta.to}
                                            to={cta.to}
                                            label={cta.label}
                                            fullWidth
                                            onClick={() => setDrawerOpen(false)}
                                        />
                                    ))}
                                </Flex>
                            ) : null}
                            <Flex
                                direction="column"
                                gap="5"
                                px="5"
                                py="6"
                                fontSize="lg"
                                fontWeight="semibold"
                            >
                                {navItems.map((item) => (
                                    <AppLink
                                        key={item.to}
                                        to={item.to}
                                        variant="primary"
                                        onClick={() => setDrawerOpen(false)}
                                    >
                                        {item.label}
                                    </AppLink>
                                ))}
                            </Flex>
                        </Drawer.Content>
                    </Drawer.Positioner>
                </Portal>
            </Drawer.Root>
        </styled.header>
    )
}

function MenuButton({
    onClick,
    'aria-label': ariaLabel,
    'aria-expanded': ariaExpanded,
}: {
    onClick: () => void
    'aria-label': string
    'aria-expanded': boolean
}) {
    return (
        <styled.button
            type="button"
            onClick={onClick}
            aria-label={ariaLabel}
            aria-expanded={ariaExpanded}
            display="inline-flex"
            alignItems="center"
            justifyContent="flex-start"
            w="10"
            h="10"
            ml="-2"
            px="2"
            // Hamburger sits on the (possibly light) header surface, so it adapts
            // via `text.primary` (was `text.on-brand` which assumed dark surface).
            color="text.primary"
            bgColor="transparent"
            border="none"
            cursor="pointer"
            borderRadius="md"
            _hover={{ bgColor: 'overlay.subtle' }}
            _focus={{ outline: '[2px solid token(colors.indigo.7)]', outlineOffset: '[2px]' }}
        >
            <MenuIcon />
        </styled.button>
    )
}

function MenuIcon() {
    return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
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

interface CtaProps {
    to: string
    label: string
    fullWidth?: boolean
    onClick?: () => void
}

function CtaPillLink({ to, label, fullWidth, onClick }: CtaProps) {
    return (
        <AppLink
            to={to}
            onClick={onClick}
            color="text.on-brand"
            _hover={{ gradientTo: 'gradient.cta-mid' }}
            bgGradient="to-r"
            gradientFrom="gradient.cta-mid"
            gradientTo="gradient.cta-end"
            borderRightRadius="full"
            display="flex"
            justifyContent="center"
            alignItems="center"
            whiteSpace="nowrap"
            flexWrap="nowrap"
            fontWeight="semibold"
            gap="2"
            px={{ base: '3', lg: '4' }}
            py="2"
            width={fullWidth ? 'full' : 'auto'}
        >
            {label}
        </AppLink>
    )
}

function CtaSquareLink({ to, label, fullWidth, onClick }: CtaProps) {
    return (
        <AppLink
            to={to}
            onClick={onClick}
            // `text.primary` so the outlined CTA adapts to either header surface
            // (dark indigo body in dark, off-white in light).
            color="text.primary"
            bgColor="transparent"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="border.emphasis"
            borderRadius="sm"
            _hover={{ bgColor: 'overlay.subtle', borderColor: 'text.highlight' }}
            display="flex"
            justifyContent="center"
            alignItems="center"
            whiteSpace="nowrap"
            flexWrap="nowrap"
            fontWeight="semibold"
            px={{ base: '3', lg: '4' }}
            py="2"
            width={fullWidth ? 'full' : 'auto'}
        >
            {label}
        </AppLink>
    )
}
