/**
 * Sponsor fallback resolver — surfaces "previous year" sponsors while the
 * current year is still being lined up.
 *
 * The conference is announced before sponsors are signed, which leaves
 * surfaces like the footer strip and home-page hero empty for months at a
 * time. Falling back to the most recent year that had sponsors keeps those
 * surfaces warm and gives lapsed sponsors residual exposure (which doubles
 * as a re-engagement signal for the sponsorship team).
 *
 * Callers receive both the resolved sponsors and a `kind` discriminator so
 * the UI can change copy ("Made possible by" → "Recent supporters") and
 * append a CTA when in fallback mode — see HeroSponsorStrip /
 * FooterSponsorRow / TicketSponsorAcknowledgement.
 */

import { conferenceManifest } from '@conference/manifest'
import type { Year, YearSponsors } from './conference-state-client-safe'

export type ResolvedSponsors =
    | { kind: 'current'; year: Year; sponsors: YearSponsors }
    | { kind: 'fallback'; year: Year; sponsors: YearSponsors }
    | { kind: 'empty' }

function hasAnySponsors(sponsors: YearSponsors | undefined): boolean {
    if (!sponsors) return false
    return Object.values(sponsors).some((tier) => Array.isArray(tier) && tier.length > 0)
}

/**
 * Resolve sponsors for display, with fallback to the most recent prior year
 * that has any sponsors. `currentYear` is the active conference year as
 * reported by `conferenceState.conference.year`.
 */
export function resolveSponsorsWithFallback(
    currentYear: Year,
    currentSponsors: YearSponsors | undefined,
): ResolvedSponsors {
    if (currentSponsors && hasAnySponsors(currentSponsors)) {
        return { kind: 'current', year: currentYear, sponsors: currentSponsors }
    }

    const currentYearNum = parseInt(currentYear, 10)
    const priorYears = Object.values(conferenceManifest.conferences.conferences)
        .filter((conf) => conf.kind === 'conference')
        .filter((conf) => parseInt(conf.year, 10) < currentYearNum)
        .sort((a, b) => parseInt(b.year, 10) - parseInt(a.year, 10))

    for (const conf of priorYears) {
        if (hasAnySponsors(conf.sponsors)) {
            return { kind: 'fallback', year: conf.year, sponsors: conf.sponsors }
        }
    }

    return { kind: 'empty' }
}
