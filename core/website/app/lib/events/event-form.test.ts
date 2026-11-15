import { describe, expect, it } from 'vitest'
import { conferenceTime } from '../dates/temporal'
import type { ConferenceEvent } from '../services/events-store'
import { eventStatus, formatEventWhen, parseEventForm, toDateTimeLocal, upcomingEvents } from './event-form'

function form(fields: Record<string, string>): FormData {
    const formData = new FormData()
    for (const [name, value] of Object.entries(fields)) formData.append(name, value)
    return formData
}

// Read in whatever timezone the conference running the suite is in.
const iso = (local: string) => conferenceTime(local).toString({ timeZoneName: 'never', fractionalSecondDigits: 3 })

const valid = {
    title: ' CFP info night ',
    description: 'How to write an abstract.',
    startsAt: '2026-12-03T17:30',
    endsAt: '2026-12-03T20:00',
    location: 'Perth CBD',
    locationUrl: 'https://maps.example/perth',
    url: 'https://www.meetup.com/example',
    linkLabel: 'RSVP',
    published: 'on',
}

function event(overrides: Partial<ConferenceEvent> = {}): ConferenceEvent {
    return {
        id: 'e1',
        slug: 'event',
        title: 'Event',
        description: 'About it',
        startsAt: iso('2026-12-03T17:30'),
        endsAt: null,
        location: null,
        locationUrl: null,
        url: null,
        linkLabel: null,
        published: true,
        updatedAt: 0,
        updatedBy: 'a@example.test',
        ...overrides,
    }
}

describe('parseEventForm', () => {
    it('reads a full form, with times in the conference timezone', () => {
        const result = parseEventForm(form(valid))
        if (!('value' in result)) throw new Error(result.errors.join())
        expect(result.value).toEqual({
            title: 'CFP info night',
            description: 'How to write an abstract.',
            startsAt: iso('2026-12-03T17:30'),
            endsAt: iso('2026-12-03T20:00'),
            location: 'Perth CBD',
            locationUrl: 'https://maps.example/perth',
            url: 'https://www.meetup.com/example',
            linkLabel: 'RSVP',
            published: true,
        })
        expect(toDateTimeLocal(result.value.startsAt)).toBe('2026-12-03T17:30')
    })

    it('treats blank optional fields as unset, and an unticked box as a draft', () => {
        const result = parseEventForm(
            form({ title: 'T', description: 'D', startsAt: '2026-12-03T17:30', endsAt: '', location: ' ', url: '', linkLabel: 'Orphan' }),
        )
        if (!('value' in result)) throw new Error(result.errors.join())
        expect(result.value).toMatchObject({
            endsAt: null,
            location: null,
            locationUrl: null,
            url: null,
            linkLabel: null,
            published: false,
        })
    })

    it('only takes http(s) links for the location, and needs a location to link from', () => {
        expect(parseEventForm(form({ ...valid, locationUrl: 'javascript:alert(1)' }))).toEqual({
            errors: [expect.stringMatching(/^Location link: must be a full http\(s\) URL/)],
        })
        expect(parseEventForm(form({ ...valid, location: '' }))).toEqual({
            errors: ['Location link: add the location name it links from'],
        })
    })

    it('reports every problem at once', () => {
        const result = parseEventForm(form({ title: '', description: '', startsAt: '', url: 'javascript:alert(1)' }))
        expect('errors' in result && result.errors).toEqual([
            'Title is required',
            'Description is required',
            'Start is required',
            expect.stringMatching(/^Link:/),
        ])
    })

    it('rejects impossible dates and an end before the start', () => {
        expect(parseEventForm(form({ ...valid, startsAt: '2026-02-30T12:00' }))).toEqual({
            errors: ['Start: not a valid date/time'],
        })
        expect(parseEventForm(form({ ...valid, endsAt: '2026-12-03T17:30' }))).toEqual({
            errors: ['End must be after the start'],
        })
    })
})

describe('which events are listed', () => {
    it('lists an event with an end time until it ends (end exclusive)', () => {
        const e = event({ endsAt: iso('2026-12-03T20:00') })
        expect(eventStatus(e, conferenceTime('2026-12-03T19:59'))).toBe('upcoming')
        expect(eventStatus(e, conferenceTime('2026-12-03T20:00'))).toBe('past')
    })

    it('lists an event with no end time through the rest of its start day', () => {
        const e = event()
        expect(eventStatus(e, conferenceTime('2026-12-03T23:59'))).toBe('upcoming')
        expect(eventStatus(e, conferenceTime('2026-12-04T00:00'))).toBe('past')
    })

    it('never lists drafts, and sorts what it lists soonest first', () => {
        const now = conferenceTime('2026-11-15T09:00')
        const events = [
            event({ id: 'later', startsAt: iso('2027-01-10T18:00') }),
            event({ id: 'draft', published: false }),
            event({ id: 'sooner', startsAt: iso('2026-11-20T18:00') }),
            event({ id: 'over', startsAt: iso('2026-11-01T18:00') }),
        ]
        expect(eventStatus(events[1], now)).toBe('draft')
        expect(upcomingEvents(events, now).map((e) => e.id)).toEqual(['sooner', 'later'])
    })
})

describe('formatEventWhen', () => {
    it('shows one date for a same-day event, both for one spanning days', () => {
        expect(formatEventWhen({ startsAt: iso('2026-12-03T17:30'), endsAt: iso('2026-12-03T20:00') })).toMatch(
            /^Thursday,? 3 December 2026, 5:30\spm – 8:00\spm$/,
        )
        expect(formatEventWhen({ startsAt: iso('2026-12-03T17:30'), endsAt: iso('2026-12-04T10:00') })).toMatch(
            /3 December 2026.* – Friday,? 4 December 2026, 10:00\sam$/,
        )
        expect(formatEventWhen({ startsAt: iso('2026-12-03T17:30'), endsAt: null })).toMatch(/5:30\spm$/)
    })
})
