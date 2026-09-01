/**
 * HeroSponsorStrip — sponsor section under the hero copy, sitting as a
 * peer to Workshops / Important Dates rather than as a quiet chrome strip.
 *
 * Each logo renders inside a fixed-height cell with both width *and*
 * height capped, so tall/portrait marks (e.g. stacked logo-over-wordmark)
 * shrink to occupy the same visual envelope as wide horizontal wordmarks.
 * Without the height cap, a 48px-tall portrait logo balloons to ~150px
 * wide and dominates the row.
 *
 * Tier weight is expressed two ways: Platinum renders as its own row above
 * Gold (never mixed into the same wrapped line), and Platinum cells are
 * taller. Within each tier all logos sit in identical boxes for a clean
 * rhythm.
 *
 * Fallback behaviour: while the current year's sponsors are still being
 * lined up, we surface the most recent prior year's Platinum + Gold under
 * "Our {year} sponsors" and append a "Join them — sponsor {currentYear}"
 * CTA. Keeps the section warm year-round and turns the empty state into
 * a sponsor-acquisition surface.
 *
 * Renders nothing when neither tier has sponsors *and* no fallback year
 * is available.
 */

import type { ReactNode } from 'react'
import { AppLink } from '~/components/app-link'
import type { Sponsor, Year } from '~/lib/conference-state-client-safe'
import type { ResolvedSponsors } from '~/lib/sponsor-fallback.server'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { SystemStyleObject } from '~/styled-system/types'
import { SponsorInlineLogo } from '../sponsor-inline-logo'

/**
 * Cell dimensions per tier. Width caps stop wide wordmarks from sprawling;
 * height caps stop portrait/stacked marks from over-towering.
 *
 * Defined via css.raw so Panda's static extraction sees the arbitrary
 * values — passing them through a variable as plain style props generates
 * the class names but not the CSS rules, silently dropping the cells.
 */
const PLATINUM_CELL = css.raw({ width: '[180px]', height: '[64px]' })
const GOLD_CELL = css.raw({ width: '[140px]', height: '[48px]' })

function SponsorRow({ sponsors, cell, children }: {
    sponsors: Sponsor[]
    cell: SystemStyleObject
    children?: ReactNode
}) {
    if (sponsors.length === 0 && !children) return null
    return (
        <Flex flexWrap="wrap" alignItems="center" columnGap="8" rowGap="6">
            {sponsors.map((sponsor) => (
                <styled.a
                    key={sponsor.name}
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    display="inline-flex"
                    alignItems="center"
                    justifyContent="center"
                    css={cell}
                    aria-label={sponsor.name}
                    opacity={0.9}
                    transition="opacity"
                    _hover={{ opacity: 1 }}
                >
                    {/* Fill the cell rather than sizing from the image's intrinsic
                        dimensions — SVGs with only a viewBox (no width/height attrs)
                        have none and would collapse to 0×0 under width/height:auto. */}
                    <SponsorInlineLogo
                        logoUrlDarkMode={sponsor.logoUrlDarkMode}
                        logoUrlLightMode={sponsor.logoUrlLightMode}
                        name={sponsor.name}
                        width="full"
                        height="full"
                        maxWidth="full"
                    />
                </styled.a>
            ))}
            {children}
        </Flex>
    )
}

export function HeroSponsorStrip({
    sponsors,
    currentYear,
}: {
    sponsors: ResolvedSponsors
    currentYear: Year
}) {
    if (sponsors.kind === 'empty') return null

    const platinum = sponsors.sponsors.platinum ?? []
    const gold = sponsors.sponsors.gold ?? []
    if (platinum.length === 0 && gold.length === 0) return null

    const isFallback = sponsors.kind === 'fallback'
    const heading = isFallback
        ? `Our ${sponsors.year} platinum and gold sponsors`
        : 'Supported by'

    return (
        <Box as="section" aria-label={heading}>
            <styled.h2
                fontSize={{ base: 'lg', md: '3xl' }}
                color="text.primary"
                fontWeight="semibold"
                width="fit"
                mb="6"
            >
                {heading}
            </styled.h2>
            <Flex direction="column" gap="6">
                <SponsorRow sponsors={platinum} cell={PLATINUM_CELL} />
                <SponsorRow sponsors={gold} cell={GOLD_CELL}>
                    {isFallback ? (
                        <AppLink
                            to="/sponsorship"
                            color="text.highlight"
                            fontSize="md"
                            fontWeight="semibold"
                            textDecoration="underline"
                            textUnderlineOffset="[3px]"
                            _hover={{ color: 'interactive.active' }}
                        >
                            Join them — sponsor {currentYear} →
                        </AppLink>
                    ) : null}
                </SponsorRow>
            </Flex>
        </Box>
    )
}
