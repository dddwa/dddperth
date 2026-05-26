/**
 * SponsorAcknowledgement — a single-line, low-footprint "X brought to you
 * by [logo] [logo] [logo]" placement for high-engagement surfaces (ticket
 * purchase, voting). Inline logos sit at text x-height and link out to
 * sponsor websites.
 *
 * Usage:
 *
 *   <SponsorAcknowledgement
 *       prefix="Tickets stay affordable thanks to"
 *       sponsors={platinumAndGoldSponsors}
 *   />
 *
 * Renders nothing if no sponsors are provided — safe to drop into pages
 * where the data may be empty (e.g. cancelled years).
 */

import type { Sponsor } from '~/lib/conference-state-client-safe'
import { Box, styled } from '~/styled-system/jsx'
import { SponsorInlineLogo } from './sponsor-inline-logo'

export interface SponsorAcknowledgementCta {
    href: string
    label: string
}

export interface SponsorAcknowledgementProps {
    /** Lead-in text, e.g. "Tickets stay affordable thanks to". */
    prefix: string
    /** Sponsors to credit. Order is preserved. */
    sponsors: Sponsor[] | undefined
    /** Optional trailing call-to-action rendered inline after the logos. */
    cta?: SponsorAcknowledgementCta
}

export function SponsorAcknowledgement({ prefix, sponsors, cta }: SponsorAcknowledgementProps) {
    if (!sponsors || sponsors.length === 0) return null

    return (
        <Box
            aria-label="Sponsor acknowledgement"
            display="flex"
            flexWrap="wrap"
            alignItems="center"
            justifyContent="center"
            columnGap="3"
            rowGap="2"
            fontSize="sm"
            color="text.secondary"
            textAlign="center"
            lineHeight="relaxed"
        >
            <styled.span>{prefix}</styled.span>
            {sponsors.map((sponsor) => (
                <styled.a
                    key={sponsor.name}
                    href={sponsor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    display="inline-flex"
                    alignItems="center"
                    aria-label={sponsor.name}
                    _hover={{ opacity: 0.8 }}
                    transition="opacity"
                >
                    <SponsorInlineLogo
                        logoUrlDarkMode={sponsor.logoUrlDarkMode}
                        logoUrlLightMode={sponsor.logoUrlLightMode}
                        name={sponsor.name}
                        height="[1.5em]"
                        maxWidth="[110px]"
                    />
                </styled.a>
            ))}
            {cta ? (
                <styled.a
                    href={cta.href}
                    color="text.highlight"
                    fontSize="sm"
                    fontWeight="semibold"
                    textDecoration="underline"
                    textUnderlineOffset="[3px]"
                    _hover={{ color: 'interactive.active' }}
                >
                    {cta.label} →
                </styled.a>
            ) : null}
        </Box>
    )
}
