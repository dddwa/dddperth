import type { ReactNode } from 'react'
import { Form } from 'react-router'
import { AppLink } from '~/components/app-link'
import { AppNavLink } from '~/components/app-nav-link'
import Logo from '~/images/svg/logo.svg?react'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

export interface PortalTab {
    to: string
    label: string
    /** Only current on an exact match — for the portal's index tab. */
    end?: boolean
}

/**
 * Shared chrome for the sponsor and speaker portals.
 *
 * The header sits on `surface.drawer` because it's the one surface every theme
 * keeps brand-dark: the site's light/dark toggle still applies to these pages,
 * and the old header used `indigo.7`, which is a pale lavender in the light
 * theme and left its white text at roughly 2:1 contrast.
 */
export function PortalShell({
    area,
    homeLabel,
    eyebrow,
    heading,
    badge,
    tabs,
    email,
    footer,
    children,
}: {
    /** "Sponsor portal" — names the area beside the logo and labels the tab nav. */
    area: string
    /** Accessible name for the logo link back to the public site. */
    homeLabel: string
    eyebrow: string
    /** The page's only h1: who this workspace belongs to. */
    heading: string
    badge?: ReactNode
    tabs?: PortalTab[]
    email: string
    footer?: ReactNode
    children: ReactNode
}) {
    return (
        <Flex direction="column" minH="screen" bg="admin.50">
            <styled.header bg="surface.drawer" color="white" px={{ base: '4', md: '8' }}>
                <Box
                    aria-hidden="true"
                    h="1"
                    mx={{ base: '-4', md: '-8' }}
                    className={css({
                        backgroundImage:
                            'linear-gradient(90deg, token(colors.brand.primary), token(colors.brand.secondary), token(colors.brand.accent))',
                    })}
                />
                <Box maxW="4xl" mx="auto">
                    <Flex justify="space-between" align="center" gap="4" py="3">
                        <Flex align="center" gap="3" minW="0">
                            <AppLink
                                unstyled
                                to="/"
                                aria-label={homeLabel}
                                color="white"
                                display="flex"
                                flexShrink="0"
                                w={{ base: '[96px]', md: '[120px]' }}
                                borderRadius="sm"
                                _focusVisible={{ outline: '[2px solid white]', outlineOffset: '[4px]' }}
                            >
                                <Logo />
                            </AppLink>
                            <Box aria-hidden="true" w="[1px]" h="5" bg="[rgba(255, 255, 255, 0.25)]" flexShrink="0" />
                            <styled.span fontSize="sm" fontWeight="medium" whiteSpace="nowrap">
                                {area}
                            </styled.span>
                        </Flex>
                        <Flex align="center" gap="3" minW="0">
                            <styled.span
                                display={{ base: 'none', sm: 'inline' }}
                                fontSize="sm"
                                color="[rgba(255, 255, 255, 0.8)]"
                                overflow="hidden"
                                textOverflow="ellipsis"
                                whiteSpace="nowrap"
                            >
                                {email}
                            </styled.span>
                            <Form method="post" action="/auth/logout">
                                <styled.button
                                    type="submit"
                                    bg="transparent"
                                    color="white"
                                    border="[1px solid rgba(255, 255, 255, 0.35)]"
                                    py="1"
                                    px="3"
                                    borderRadius="md"
                                    cursor="pointer"
                                    fontSize="sm"
                                    whiteSpace="nowrap"
                                    _hover={{ bg: '[rgba(255, 255, 255, 0.12)]', borderColor: 'white' }}
                                    _focusVisible={{ outline: '[2px solid white]', outlineOffset: '[2px]' }}
                                >
                                    Sign out
                                </styled.button>
                            </Form>
                        </Flex>
                    </Flex>

                    <Box pt={{ base: '5', md: '8' }} pb={tabs ? '4' : { base: '6', md: '8' }}>
                        <styled.p
                            fontSize="xs"
                            fontWeight="semibold"
                            textTransform="uppercase"
                            letterSpacing="wider"
                            color="[rgba(255, 255, 255, 0.8)]"
                            mb="1"
                        >
                            {eyebrow}
                        </styled.p>
                        <Flex align="center" gap="3" flexWrap="wrap">
                            <styled.h1
                                m="0"
                                fontSize={{ base: '2xl', md: '3xl' }}
                                fontWeight="bold"
                                letterSpacing="tight"
                                lineHeight="tight"
                            >
                                {heading}
                            </styled.h1>
                            {badge}
                        </Flex>
                    </Box>

                    {tabs && (
                        <styled.nav aria-label={`${area} sections`}>
                            <styled.ul
                                display="flex"
                                listStyle="none"
                                m="0"
                                p="0"
                                gap={{ base: '5', md: '7' }}
                                overflowX="auto"
                            >
                                {tabs.map((tab) => (
                                    <li key={tab.to}>
                                        <AppNavLink to={tab.to} end={tab.end} variant="portalTab" prefetch="intent">
                                            {tab.label}
                                        </AppNavLink>
                                    </li>
                                ))}
                            </styled.ul>
                        </styled.nav>
                    )}
                </Box>
            </styled.header>

            <styled.main flex="1" px={{ base: '4', md: '8' }} py={{ base: '6', md: '8' }}>
                {children}
            </styled.main>

            {footer && (
                <styled.footer
                    px={{ base: '4', md: '8' }}
                    pb="8"
                    textAlign="center"
                    fontSize="sm"
                    color="admin.600"
                >
                    {footer}
                </styled.footer>
            )}
        </Flex>
    )
}

/**
 * Tier colours are fixed rather than theme tokens: the badge sits on the
 * brand-dark header in every theme. Matched on the tier name because the raw
 * Jira value is all the layout has ("Gold", "Platinum Sponsor", ...).
 * Each pair clears 4.5:1.
 */
const tierBadgeColours: Array<{ match: string; className: string }> = [
    { match: 'platinum', className: css({ bg: '[#e2e8f0]', color: '[#1e293b]' }) },
    { match: 'gold', className: css({ bg: '[#f6d77b]', color: '[#4a3500]' }) },
    { match: 'silver', className: css({ bg: '[#cbd5e1]', color: '[#1e293b]' }) },
    { match: 'bronze', className: css({ bg: '[#e9b48a]', color: '[#4a2208]' }) },
]
const neutralTierBadge = css({ bg: '[rgba(255, 255, 255, 0.15)]', color: 'white' })

export function TierBadge({ tier }: { tier: string }) {
    const lower = tier.toLowerCase()
    const colours = tierBadgeColours.find(({ match }) => lower.includes(match))?.className ?? neutralTierBadge

    return (
        <styled.span
            className={colours}
            py="0.5"
            px="2.5"
            borderRadius="full"
            fontSize="xs"
            fontWeight="bold"
            textTransform="uppercase"
            letterSpacing="wider"
            whiteSpace="nowrap"
        >
            {tier}
        </styled.span>
    )
}
