import { describe, expect, it } from 'vitest'
import {
    type CalendarEvent,
    calendarEventDetails,
    eventIcs,
    googleCalendarUrl,
    outlookCalendarUrl,
} from './event-calendar'

// Perth is UTC+8 with no daylight saving.
const event: CalendarEvent = {
    slug: 'end-of-year-social',
    title: 'End of year social',
    startsAt: '2026-12-03T17:30:00.000+08:00',
    endsAt: '2026-12-03T20:00:00.000+08:00',
    location: 'The Pub, Perth',
}
const details = (overrides: Partial<CalendarEvent> = {}) =>
    calendarEventDetails({ ...event, ...overrides }, { siteOrigin: 'https://dddperth.com', summary: 'Drinks & chat' })

const unfold = (ics: string) => ics.replace(/\r\n[ \t]/g, '')

describe('calendarEventDetails', () => {
    it('converts conference time to UTC', () => {
        const { start, end } = details()
        expect(start.toString()).toBe('2026-12-03T09:30:00+00:00[UTC]')
        expect(end.toString()).toBe('2026-12-03T12:00:00+00:00[UTC]')
    })

    it('gives an event with no end time a one-hour slot', () => {
        expect(details({ endsAt: null }).end.toString()).toBe('2026-12-03T10:30:00+00:00[UTC]')
    })

    it('links back to the event page under the description', () => {
        expect(details().description).toBe('Drinks & chat\n\nDetails: https://dddperth.com/events/end-of-year-social')
    })
})

describe('googleCalendarUrl', () => {
    it('prefills the event in UTC', () => {
        const url = new URL(googleCalendarUrl(details()))
        expect(url.origin).toBe('https://calendar.google.com')
        expect(url.searchParams.get('action')).toBe('TEMPLATE')
        expect(url.searchParams.get('text')).toBe('End of year social')
        expect(url.searchParams.get('dates')).toBe('20261203T093000Z/20261203T120000Z')
        expect(url.searchParams.get('location')).toBe('The Pub, Perth')
        expect(url.searchParams.get('details')).toContain('Drinks & chat')
    })

    it('leaves location out when there is none', () => {
        const url = new URL(googleCalendarUrl(details({ location: null })))
        expect(url.searchParams.has('location')).toBe(false)
    })
})

describe('outlookCalendarUrl', () => {
    it.each([
        ['personal', 'https://outlook.live.com'],
        ['work', 'https://outlook.office.com'],
    ] as const)('sends %s accounts to %s', (account, origin) => {
        const url = new URL(outlookCalendarUrl(details(), account))
        expect(url.origin).toBe(origin)
        expect(url.searchParams.get('subject')).toBe('End of year social')
        expect(url.searchParams.get('startdt')).toBe('2026-12-03T09:30:00Z')
        expect(url.searchParams.get('enddt')).toBe('2026-12-03T12:00:00Z')
        expect(url.searchParams.get('location')).toBe('The Pub, Perth')
    })
})

describe('eventIcs', () => {
    const ics = unfold(eventIcs(details(), { productId: 'DDD Perth' }))

    it('emits one UTC event with the page URL', () => {
        expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
        expect(ics).toContain('DTSTART:20261203T093000Z')
        expect(ics).toContain('DTEND:20261203T120000Z')
        expect(ics).toContain('SUMMARY:End of year social')
        expect(ics).toContain('URL:https://dddperth.com/events/end-of-year-social')
    })

    it('uses a uid that is stable per event, so re-importing updates it', () => {
        expect(ics).toContain('UID:event-end-of-year-social@dddperth.com')
    })
})
