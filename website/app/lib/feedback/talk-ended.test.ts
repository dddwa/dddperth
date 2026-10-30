import { conferenceTime, Temporal } from '~/lib/dates/temporal'
import { describe, expect, it } from 'vitest'
import { hasTalkEnded } from './talk-ended'

const TZ = 'Australia/Perth'
const at = (iso: string) => Temporal.Instant.from(`${iso}+08:00`).epochMilliseconds

describe('hasTalkEnded', () => {
    it('is false before the talk ends', () => {
        expect(hasTalkEnded('2026-10-03T10:30:00', at('2026-10-03T10:29:59'), TZ)).toBe(false)
    })

    it('is true from the moment the talk ends', () => {
        expect(hasTalkEnded('2026-10-03T10:30:00', at('2026-10-03T10:30:00'), TZ)).toBe(true)
        expect(hasTalkEnded('2026-10-03T10:30:00', at('2026-10-03T14:00:00'), TZ)).toBe(true)
    })

    it('reads Sessionize local times in the conference timezone, not the runtime one', () => {
        // 10:30 Perth is 02:30 UTC.
        expect(hasTalkEnded('2026-10-03T10:30:00', Date.parse('2026-10-03T02:29:00Z'), TZ)).toBe(false)
        expect(hasTalkEnded('2026-10-03T10:30:00', Date.parse('2026-10-03T02:31:00Z'), TZ)).toBe(true)
    })

    it('honours an explicit offset when the time carries one', () => {
        expect(hasTalkEnded('2026-10-03T10:30:00.000+10:30', at('2026-10-03T08:01:00'), TZ)).toBe(true)
    })

    it('treats a talk with no usable end time as over', () => {
        expect(hasTalkEnded(null, at('2026-10-03T08:00:00'), TZ)).toBe(true)
        expect(hasTalkEnded('not a date', at('2026-10-03T08:00:00'), TZ)).toBe(true)
    })

    it('defaults to the configured conference timezone', () => {
        expect(hasTalkEnded('2026-10-03T10:30:00', conferenceTime('2026-10-03T10:29:59').epochMilliseconds)).toBe(false)
        expect(hasTalkEnded('2026-10-03T10:30:00', conferenceTime('2026-10-03T10:30:00').epochMilliseconds)).toBe(true)
    })
})
