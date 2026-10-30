import { Temporal } from '~/lib/dates/temporal'
import { describe, expect, it } from 'vitest'
import { getHeaderNavItems, getVenueNavPlacement } from './header-nav'

const zone = 'Australia/Perth'
const conferenceDayStart = Temporal.PlainDate.from('2026-10-03').toZonedDateTime(zone)
const at = (iso: string) => Temporal.PlainDateTime.from(iso).toZonedDateTime(zone)

const nav = [
    { to: '/agenda', label: 'Agenda' },
    { to: '/about', label: 'About' },
    { to: '/blog', label: 'Blog' },
]

describe('getVenueNavPlacement', () => {
    const base = { venuePublished: true, replacesAboutNearConference: true, conferenceDayStart }

    it('hides the venue link until a venue is published', () => {
        expect(getVenueNavPlacement({ ...base, venuePublished: false, now: at('2026-10-01T12:00') })).toBe('hidden')
    })

    it('puts the venue beside About whenever published, when the feature is off', () => {
        expect(
            getVenueNavPlacement({ ...base, replacesAboutNearConference: false, now: at('2026-03-01T12:00') }),
        ).toBe('before-about')
    })

    it('replaces About from midnight a week before until conference day ends', () => {
        expect(getVenueNavPlacement({ ...base, now: at('2026-09-25T23:59') })).toBe('hidden')
        expect(getVenueNavPlacement({ ...base, now: at('2026-09-26T00:00') })).toBe('replaces-about')
        expect(getVenueNavPlacement({ ...base, now: at('2026-10-03T23:59') })).toBe('replaces-about')
        expect(getVenueNavPlacement({ ...base, now: at('2026-10-04T00:00') })).toBe('hidden')
    })

    it("takes the window's day boundaries from the conference's zone, not now's", () => {
        // 01:00 on 4 October in Perth, but still 3 October in UTC.
        const now = Temporal.Instant.from('2026-10-03T17:00:00Z').toZonedDateTimeISO('UTC')
        expect(getVenueNavPlacement({ ...base, now })).toBe('hidden')
    })
})

describe('getHeaderNavItems', () => {
    it('leaves the nav alone when the venue link is hidden', () => {
        expect(getHeaderNavItems(nav, 'hidden')).toEqual(nav)
    })

    it('inserts Venue before About', () => {
        expect(getHeaderNavItems(nav, 'before-about').map((i) => i.label)).toEqual(['Agenda', 'Venue', 'About', 'Blog'])
    })

    it('swaps About for Venue in place', () => {
        expect(getHeaderNavItems(nav, 'replaces-about').map((i) => i.label)).toEqual(['Agenda', 'Venue', 'Blog'])
    })

    it('appends Venue when the nav has no About', () => {
        expect(getHeaderNavItems([nav[0]], 'replaces-about').map((i) => i.label)).toEqual(['Agenda', 'Venue'])
    })
})
