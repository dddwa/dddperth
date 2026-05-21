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
 * Tier weight is still expressed (Platinum cells taller than Gold) but
 * within each tier all logos sit in identical boxes for a clean rhythm.
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

import { AppLink } from '~/components/app-link'
import type { Sponsor, Year, YearSponsors } from '~/lib/conference-state-client-safe'
import type { ResolvedSponsors } from '~/lib/sponsor-fallback.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { SponsorInlineLogo } from '../sponsor-inline-logo'

/**
 * Cell dimensions per tier. Width caps stop wide wordmarks from sprawling;
 * height caps stop portrait/stacked marks from over-towering.
 */
const PLATINUM_CELL = { width: '[180px]', height: '[64px]' } as const
const GOLD_CELL = { width: '[140px]', height: '[48px]' } as const

interface HeroSponsorEntry {
    sponsor: Sponsor
    cell: typeof PLATINUM_CELL | typeof GOLD_CELL
}

function collect(sponsors: YearSponsors): HeroSponsorEntry[] {
    const entries: HeroSponsorEntry[] = []
    for (const sponsor of sponsors.platinum ?? []) {
        entries.push({ sponsor, cell: PLATINUM_CELL })
    }
    for (const sponsor of sponsors.gold ?? []) {
        entries.push({ sponsor, cell: GOLD_CELL })
    }
    return entries
}

export function HeroSponsorStrip({
    sponsors,
    currentYear,
}: {
    sponsors: ResolvedSponsors
    currentYear: Year
}) {
    if (sponsors.kind === 'empty') return null

    const entries = collect(sponsors.sponsors)
    if (entries.length === 0) return null

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
            <Flex flexWrap="wrap" alignItems="center" columnGap="8" rowGap="6">
                {entries.map(({ sponsor, cell }) => (
                    <styled.a
                        key={sponsor.name}
                        href={sponsor.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        display="inline-flex"
                        alignItems="center"
                        justifyContent="center"
                        width={cell.width}
                        height={cell.height}
                        aria-label={sponsor.name}
                        opacity={0.9}
                        transition="opacity"
                        _hover={{ opacity: 1 }}
                    >
                        <SponsorInlineLogo
                            logoUrlDarkMode={sponsor.logoUrlDarkMode}
                            logoUrlLightMode={sponsor.logoUrlLightMode}
                            name={sponsor.name}
                            height="auto"
                            width="auto"
                            maxWidth="full"
                            maxHeight="full"
                        />
                    </styled.a>
                ))}
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
            </Flex>
        </Box>
    )
}
