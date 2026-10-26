import { conferenceDayStart, conferenceInstant, tryConferenceTime } from '~/lib/dates/temporal'
import { createConferenceDates } from '@ddd/conference-config'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Temporal, conferenceDate, conferenceTime } from './temporal'

vi.mock('@conference/config/public', () => ({ conferenceConfigPublic: { timezone: 'Australia/Sydney' } }))
const originalTZ = process.env.TZ
afterEach(() => { if (originalTZ === undefined) delete process.env.TZ; else process.env.TZ = originalTZ })

describe('conference Temporal values', () => {
    it.each(['UTC', 'America/Los_Angeles', 'Australia/Perth'])('keeps calendar dates and wall times independent of host %s', (host) => {
        process.env.TZ = host
        const date = conferenceDate('2026-10-03')
        expect(date).toBeInstanceOf(Temporal.PlainDate)
        expect(date.toString()).toBe('2026-10-03')
        expect(date.dayOfWeek).toBe(6)
        expect(conferenceTime('2026-10-03T09:00').timeZoneId).toBe('Australia/Sydney')
        expect(conferenceTime('2026-10-03T09:00').hour).toBe(9)
    })

    it('preserves offset-bearing instants, including Jira offsets and annotated Temporal strings', () => {
        for (const iso of ['2026-10-03T00:00Z', '2026-10-03T08:00+0800', '2026-10-03T08:00+08:00[Australia/Perth]']) {
            expect(conferenceTime(iso).epochMilliseconds).toBe(Date.parse('2026-10-03T00:00Z'))
            expect(conferenceTime(iso).timeZoneId).toBe('Australia/Sydney')
        }
        expect(conferenceTime('2026-10-03T00:00Z', { timeZone: 'Europe/London' }).hour).toBe(1)
    })

    it('uses named-zone daylight-saving rules and calendar days', () => {
        const before = conferenceTime('2026-10-04T00:00')
        const after = before.add({ days: 1 })
        expect(before.until(after, { largestUnit: 'hours' }).hours).toBe(23)
        expect(before.toPlainDate().until(after.toPlainDate()).days).toBe(1)
    })

    it('binds independent conference zones without leaking per-call overrides', () => {
        const perth = createConferenceDates('Australia/Perth')
        const sydney = createConferenceDates('Australia/Sydney')
        const wallTime = '2026-10-04T09:00'
        expect(perth.conferenceTime(wallTime).hour).toBe(9)
        expect(sydney.conferenceTime(wallTime).epochMilliseconds).toBe(perth.conferenceTime(wallTime).epochMilliseconds - 3 * 3_600_000)
        expect(perth.conferenceTime(wallTime, { timeZone: 'UTC' }).timeZoneId).toBe('UTC')
        expect(perth.conferenceTime(wallTime, { timeZone: undefined }).timeZoneId).toBe('Australia/Perth')
        expect(perth.conferenceDayStart('2026-10-04', { timeZone: undefined }).timeZoneId).toBe('Australia/Perth')
        const before = sydney.conferenceDayStart('2026-04-05')
        expect(before.until(before.add({ days: 1 }), { largestUnit: 'hours' }).hours).toBe(25)
    })

    it('rejects ambiguous and nonexistent wall times unless the caller chooses a policy', () => {
        expect(() => conferenceTime('2026-10-04T02:30')).toThrow(RangeError)
        expect(() => conferenceTime('2026-04-05T02:30')).toThrow(RangeError)
        expect(conferenceTime('2026-10-04T02:30', { disambiguation: 'later' }).hour).toBe(3)
        const early = conferenceTime('2026-04-05T02:30', { disambiguation: 'earlier' })
        const late = conferenceTime('2026-04-05T02:30', { disambiguation: 'later' })
        expect(late.epochMilliseconds - early.epochMilliseconds).toBe(3_600_000)
    })

    it('rejects invalid dates and accidental date/datetime coercion', () => {
        expect(() => conferenceDate('2026-02-30')).toThrow(RangeError)
        expect(() => conferenceDate('2026-10-03T09:00')).toThrow(RangeError)
        expect(() => conferenceTime('2026-10-03')).toThrow(RangeError)
        expect(() => conferenceTime('not a date')).toThrow(RangeError)
    })

    it('makes date-to-instant conversion explicit and defaults epoch values to the configured zone', () => {
        const midnight = conferenceDayStart('2026-10-04')
        expect(midnight.hour).toBe(0)
        expect(midnight.timeZoneId).toBe('Australia/Sydney')
        expect(conferenceInstant(midnight.epochMilliseconds).equals(midnight)).toBe(true)
        expect(conferenceInstant(midnight.epochMilliseconds, { timeZone: undefined }).equals(midnight)).toBe(true)
        expect(conferenceDayStart('2026-10-04', { timeZone: 'Europe/London' }).timeZoneId).toBe('Europe/London')
        expect(tryConferenceTime('not a date')).toBeUndefined()
        expect(tryConferenceTime('2026-10-04T02:30')).toBeUndefined()
    })

    it('round-trips through the strings loaders send to browsers', () => {
        const server = conferenceTime('2026-10-03T09:00')
        const json = JSON.stringify({ date: server.toPlainDate(), start: server })
        const client = JSON.parse(json) as { date: string; start: string }
        expect(conferenceDate(client.date).equals(server.toPlainDate())).toBe(true)
        expect(conferenceTime(client.start).equals(server)).toBe(true)
    })

    it('uses standard comparisons instead of implicit object coercion', () => {
        const first = conferenceTime('2026-10-03T09:00')
        const second = first.add({ minutes: 1 })
        expect(Temporal.ZonedDateTime.compare(first, second)).toBe(-1)
        expect(Temporal.Instant.compare(first.toInstant(), second.toInstant())).toBe(-1)
    })
})
