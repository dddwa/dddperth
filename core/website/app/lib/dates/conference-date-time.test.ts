import { afterEach, describe, expect, it, vi } from 'vitest'
import { DateTime, Settings } from 'luxon'
import { conferenceConfigPublic } from '@conference/config/public'
import { conferenceDateTime } from './conference-date-time'
import { splitBumpSlot } from '../sponsors/exhibitor-export'
import { urgencyFor } from '../speakers/checklist'

// Deliberately differs from the host and includes DST: defaults must come
// from configuration, rather than a hard-coded Perth or UTC fallback.
vi.mock('@conference/config/public', () => ({ conferenceConfigPublic: { timezone: 'Australia/Sydney' } }))
const originalZone = Settings.defaultZone

afterEach(() => { Settings.defaultZone = originalZone })

describe('conferenceDateTime', () => {
    it.each(['UTC', 'America/Los_Angeles', 'Australia/Perth'])('uses the configured IANA zone with host %s', (host) => {
        Settings.defaultZone = host
        const winter = conferenceDateTime.fromISO('2026-07-13T00:00')
        const summer = conferenceDateTime.fromISO('2026-12-13T00:00')
        expect(winter.zoneName).toBe(conferenceConfigPublic.timezone)
        expect(winter.offset).toBe(600)
        expect(summer.offset).toBe(660)
        expect(winter.toISODate()).toBe('2026-07-13')
    })

    it('preserves offset-bearing instants while displaying in the configured zone', () => {
        Settings.defaultZone = 'America/Los_Angeles'
        const date = conferenceDateTime.fromISO('2026-12-12T13:00Z')
        expect(date.toISODate()).toBe('2026-12-13')
        expect(date.hour).toBe(0)
        expect(date.toMillis()).toBe(Date.parse('2026-12-12T13:00Z'))
    })

    it('allows an explicit zone override without changing the default', () => {
        expect(conferenceDateTime.fromISO('2026-12-13T00:00', { zone: 'Europe/London' }).offset).toBe(0)
        expect(conferenceDateTime.fromISO('2026-12-13T00:00').offset).toBe(660)
        expect(conferenceDateTime.fromISO('2026-12-13T00:00', { zone: undefined }).offset).toBe(660)
    })

    it('uses IANA daylight-saving rules for calendar arithmetic', () => {
        const start = conferenceDateTime.fromISO('2026-10-04T00:00')
        expect(start.plus({ days: 1 }).diff(start, 'hours').hours).toBe(23)
    })

    it('converts epochs, native dates, and formatted wall times through the same default', () => {
        const iso = '2026-12-13T00:00+11:00'
        const ms = Date.parse(iso)
        for (const value of [
            conferenceDateTime.fromMillis(ms),
            conferenceDateTime.fromSeconds(ms / 1000),
            conferenceDateTime.fromJSDate(new Date(ms)),
            conferenceDateTime.fromFormat('2026-12-13 00:00', 'yyyy-MM-dd HH:mm'),
            conferenceDateTime.fromObject({ year: 2026, month: 12, day: 13, hour: 0 }),
        ]) {
            expect(value.zoneName).toBe('Australia/Sydney')
            expect(value.toMillis()).toBe(ms)
        }
    })

    it('keeps important-date calendar comparisons in the configured day', () => {
        Settings.defaultZone = 'UTC'
        const now = conferenceDateTime.fromISO('2026-07-12T23:30')
        const event = conferenceDateTime.fromISO('2026-07-13T00:00+10:00')
        expect(now.hasSame(event, 'day')).toBe(false)
        expect(event.toLocaleString(DateTime.DATE_MED, { locale: 'en-AU' })).toContain('13 July')
    })

    it('keeps deadline comparisons at the same instant', () => {
        const deadline = '2026-07-13T00:00+10:00'
        const now = conferenceDateTime.fromISO(deadline).minus({ days: 2 })
        expect(urgencyFor(deadline, false, now)).toBe('upcoming')
    })

    it('keeps exhibitor weekday arithmetic out of the host zone', () => {
        Settings.defaultZone = 'America/Los_Angeles'
        // Sydney midnight is Friday in UTC and Los Angeles. A native local
        // weekday calculation would walk back an extra week to Saturday.
        const date = new Date('2026-10-03T00:00+10:00')
        expect(splitBumpSlot('Saturday 4pm', date)).toEqual({ date: '03/10/2026', time: '16:00' })
    })
})
