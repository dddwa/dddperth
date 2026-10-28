import type { NavConfig } from '@ddd/conference-config'
import { Temporal } from '~/lib/dates/temporal'

/**
 * Where the header's Venue link goes:
 *  - `hidden`: no venue published, or outside the window when Venue replaces About
 *  - `before-about`: beside About, just before it
 *  - `replaces-about`: in About's place
 */
export type VenueNavPlacement = 'hidden' | 'before-about' | 'replaces-about'

const VENUE_ITEM = { to: '/venue', label: 'Venue' }

export function getVenueNavPlacement({
    venuePublished,
    replacesAboutNearConference,
    now,
    conferenceDayStart,
}: {
    venuePublished: boolean
    replacesAboutNearConference: boolean
    now: Temporal.ZonedDateTime
    conferenceDayStart: Temporal.ZonedDateTime | undefined
}): VenueNavPlacement {
    if (!venuePublished) return 'hidden'
    if (!replacesAboutNearConference) return 'before-about'
    if (!conferenceDayStart) return 'hidden'
    // Day boundaries in the conference's own zone, whatever zone `now` is in.
    const opens = conferenceDayStart.subtract({ days: 7 })
    const closes = conferenceDayStart.add({ days: 1 })
    return Temporal.ZonedDateTime.compare(now, opens) >= 0 && Temporal.ZonedDateTime.compare(now, closes) < 0
        ? 'replaces-about'
        : 'hidden'
}

export function getHeaderNavItems(nav: NavConfig, placement: VenueNavPlacement): NavConfig {
    if (placement === 'hidden') return nav
    const aboutIdx = nav.findIndex((i) => i.to === '/about')
    if (aboutIdx === -1) return [...nav, VENUE_ITEM]
    const removeAbout = placement === 'replaces-about' ? 1 : 0
    return [...nav.slice(0, aboutIdx), VENUE_ITEM, ...nav.slice(aboutIdx + removeAbout)]
}
