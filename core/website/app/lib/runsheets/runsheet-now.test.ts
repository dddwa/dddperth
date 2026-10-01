import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { isRunsheetItemNow, OPEN_ENDED_ITEM_MINUTES } from './runsheet-now'

const timezone = 'Australia/Perth'
const at = (local: string) => DateTime.fromISO(local, { zone: timezone }).toMillis()

describe('isRunsheetItemNow', () => {
    const item = { startTime: '2026-11-14T09:00:00+08:00', endTime: '2026-11-14T09:45:00+08:00' }

    it('includes the start and excludes the end, so back-to-back rows never both highlight', () => {
        expect(isRunsheetItemNow(item, at('2026-11-14T08:59:59'), timezone)).toBe(false)
        expect(isRunsheetItemNow(item, at('2026-11-14T09:00:00'), timezone)).toBe(true)
        expect(isRunsheetItemNow(item, at('2026-11-14T09:44:59'), timezone)).toBe(true)
        expect(isRunsheetItemNow(item, at('2026-11-14T09:45:00'), timezone)).toBe(false)
    })

    it('reads offset-less Sessionize times in the conference timezone, not the device one', () => {
        const session = { startTime: '2026-11-14T09:00:00', endTime: '2026-11-14T09:45:00' }
        expect(isRunsheetItemNow(session, at('2026-11-14T09:10:00'), timezone)).toBe(true)
        expect(isRunsheetItemNow(session, at('2026-11-14T17:10:00'), timezone)).toBe(false)
    })

    it(`treats a row with no end as current for ${OPEN_ENDED_ITEM_MINUTES} minutes`, () => {
        const openEnded = { startTime: '2026-11-14T09:00:00+08:00', endTime: null }
        expect(isRunsheetItemNow(openEnded, at('2026-11-14T09:14:59'), timezone)).toBe(true)
        expect(isRunsheetItemNow(openEnded, at('2026-11-14T09:15:00'), timezone)).toBe(false)
    })

    it('never highlights a row with no usable start', () => {
        const now = at('2026-11-14T09:10:00')
        expect(isRunsheetItemNow({ startTime: null, endTime: item.endTime }, now, timezone)).toBe(false)
        expect(isRunsheetItemNow({ startTime: 'not a date', endTime: item.endTime }, now, timezone)).toBe(false)
    })
})
