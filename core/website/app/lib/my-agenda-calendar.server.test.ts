import { describe, expect, it } from 'vitest'
import { projectGridSmart } from '../../e2e/fixtures/sessionize/projections'
import { MAX_CALENDAR_TALKS, buildMyAgendaCalendar, parseRequestedTalkIds } from './my-agenda-calendar.server'

const schedule = projectGridSmart()[0]
const talks = schedule.rooms.flatMap((room) => room.sessions.filter((session) => !session.isServiceSession))
const serviceSession = schedule.rooms.flatMap((room) => room.sessions).find((session) => session.isServiceSession)

const build = (requestedIds: string[]) =>
    buildMyAgendaCalendar({
        talks,
        requestedIds,
        timezone: 'Australia/Perth',
        conferenceName: 'DDD Perth',
        year: '2026',
        siteOrigin: 'https://dddperth.com',
        venue: {
            name: 'Optus Stadium',
            address: {
                streetAddress: '333 Victoria Park Dr',
                addressLocality: 'Burswood',
                addressRegion: 'WA',
                postalCode: '6100',
                addressCountry: 'AU',
            },
            latitude: 0,
            longitude: 0,
        },
    })

const eventCount = (ics: string | undefined) => (ics?.match(/BEGIN:VEVENT/g) ?? []).length

// "Fixture Talk 02", 10:45-11:30 Perth time.
const talk02 = talks.find((talk) => talk.title === 'Fixture Talk 02')

describe('buildMyAgendaCalendar', () => {
    it('emits one event per requested talk', () => {
        expect(eventCount(build([talks[0].id, talks[1].id]))).toBe(2)
    })

    it('emits times in UTC, converted from conference-local time', () => {
        // Perth is UTC+8 with no daylight saving.
        const ics = build([talk02?.id ?? ''])

        expect(ics).toMatch(/DTSTART:\d{8}T024500Z/)
        expect(ics).toMatch(/DTEND:\d{8}T033000Z/)
    })

    it('names the talk, its room and the venue, and links back to the talk page', () => {
        const ics = build([talk02?.id ?? ''])?.replace(/\r\n[ \t]/g, '')

        expect(ics).toContain('SUMMARY:Fixture Talk 02')
        expect(ics).toContain(`LOCATION:${talk02?.room}\\, Optus Stadium`)
        expect(ics).toContain(`URL:https://dddperth.com/agenda/2026/talk/${talk02?.id}`)
    })

    it('gives each talk a stable uid, so re-importing updates rather than duplicates', () => {
        const first = build([talk02?.id ?? ''])
        const second = build([talk02?.id ?? '', talks[0].id])

        expect(first).toContain(`UID:2026-${talk02?.id}@dddperth.com`)
        expect(second).toContain(`UID:2026-${talk02?.id}@dddperth.com`)
    })

    it('ignores ids that are not talks on the agenda', () => {
        // The endpoint's whole safety property: the ids only filter the
        // published agenda, so an unknown id yields nothing rather than a
        // lookup somewhere else.
        expect(eventCount(build([talks[0].id, 'not-a-talk', '999999999']))).toBe(1)
    })

    it('returns nothing when no requested id is on the agenda', () => {
        expect(build(['not-a-talk'])).toBeUndefined()
        expect(build([])).toBeUndefined()
    })

    it('never emits a break or changeover, even if asked for one by id', () => {
        expect(serviceSession).toBeDefined()
        expect(build([serviceSession?.id ?? ''])).toBeUndefined()
    })
})

describe('parseRequestedTalkIds', () => {
    it('splits, trims and de-duplicates', () => {
        expect(parseRequestedTalkIds(' 1, 2 ,1,3')).toEqual(['1', '2', '3'])
    })

    it('drops malformed ids rather than rejecting the whole request', () => {
        expect(parseRequestedTalkIds('1,<script>,,2,' + 'a'.repeat(65))).toEqual(['1', '2'])
    })

    it('caps how many ids one request can ask for', () => {
        const many = Array.from({ length: MAX_CALENDAR_TALKS + 50 }, (_, i) => String(i)).join(',')
        expect(parseRequestedTalkIds(many)).toHaveLength(MAX_CALENDAR_TALKS)
    })

    it('treats a missing parameter as no ids', () => {
        expect(parseRequestedTalkIds(null)).toEqual([])
    })
})
