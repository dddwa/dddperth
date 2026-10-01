import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { isRunsheetClosed } from './runsheet-availability.server'

const timezone = 'Australia/Perth'
const at = (local: string) => DateTime.fromISO(local, { zone: timezone })

describe('isRunsheetClosed', () => {
    // A Saturday, as DDD Perth always is.
    const conferenceDate = '2026-11-14'

    it('stays open through the conference weekend, including Sunday bump-out', () => {
        expect(isRunsheetClosed(conferenceDate, at('2026-11-13T15:00'), timezone)).toBe(false)
        expect(isRunsheetClosed(conferenceDate, at('2026-11-14T09:00'), timezone)).toBe(false)
        expect(isRunsheetClosed(conferenceDate, at('2026-11-15T23:59:59'), timezone)).toBe(false)
    })

    it('closes from midnight on the Monday after, in the conference timezone', () => {
        expect(isRunsheetClosed(conferenceDate, at('2026-11-16T00:00:00'), timezone)).toBe(true)
        // 23:30 Sunday in UTC is already Monday morning in Perth.
        expect(isRunsheetClosed(conferenceDate, DateTime.fromISO('2026-11-15T16:30:00Z'), timezone)).toBe(true)
        expect(isRunsheetClosed(conferenceDate, at('2027-03-01T09:00'), timezone)).toBe(true)
    })

    it('stays open with no conference date to measure from', () => {
        expect(isRunsheetClosed(undefined, at('2027-03-01T09:00'), timezone)).toBe(false)
    })
})
