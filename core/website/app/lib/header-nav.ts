import type { NavConfig } from '@ddd/conference-config'
import type { DateTime } from 'luxon'

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
    conferenceDate,
}: {
    venuePublished: boolean
    replacesAboutNearConference: boolean
    now: DateTime
    conferenceDate: DateTime | undefined
}): VenueNavPlacement {
    if (!venuePublished) return 'hidden'
    if (!replacesAboutNearConference) return 'before-about'
    if (!conferenceDate) return 'hidden'
    const day = conferenceDate.setZone(now.zone)
    const opens = day.startOf('day').minus({ days: 7 })
    const closes = day.endOf('day')
    return now >= opens && now <= closes ? 'replaces-about' : 'hidden'
}

export function getHeaderNavItems(nav: NavConfig, placement: VenueNavPlacement): NavConfig {
    if (placement === 'hidden') return nav
    const aboutIdx = nav.findIndex((i) => i.to === '/about')
    if (aboutIdx === -1) return [...nav, VENUE_ITEM]
    const removeAbout = placement === 'replaces-about' ? 1 : 0
    return [...nav.slice(0, aboutIdx), VENUE_ITEM, ...nav.slice(aboutIdx + removeAbout)]
}
