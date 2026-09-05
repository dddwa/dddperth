import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { buildCalendarDataUrl } from './calendar.server'

describe('buildCalendarDataUrl', () => {
    it('produces a downloadable ics data URL with the event details', () => {
        const url = buildCalendarDataUrl({
            title: 'Speaker Training — Session 1',
            description: 'Planning, building and writing your talk',
            start: DateTime.fromISO('2026-09-02T17:30:00', { zone: 'Australia/Perth' }),
            end: DateTime.fromISO('2026-09-02T20:00:00', { zone: 'Australia/Perth' }),
        })

        expect(url.startsWith('data:text/calendar;charset=utf8,')).toBe(true)

        const ics = decodeURIComponent(url.slice('data:text/calendar;charset=utf8,'.length))
        expect(ics).toContain('BEGIN:VEVENT')
        expect(ics).toContain('SUMMARY:Speaker Training — Session 1')
        // 17:30 AWST (UTC+8, no DST) on 2 Sep 2026 = 09:30 UTC.
        expect(ics).toContain('DTSTART:20260902T093000Z')
        expect(ics).toContain('DTEND:20260902T120000Z')
    })

    it('includes the location when given', () => {
        const url = buildCalendarDataUrl({
            title: 'Speaker Dinner',
            start: DateTime.fromISO('2026-10-02T18:00:00', { zone: 'Australia/Perth' }),
            end: DateTime.fromISO('2026-10-02T20:00:00', { zone: 'Australia/Perth' }),
            location: 'TBC',
        })
        const ics = decodeURIComponent(url.slice('data:text/calendar;charset=utf8,'.length))
        expect(ics).toContain('LOCATION:TBC')
    })
})
