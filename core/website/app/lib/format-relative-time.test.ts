import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { formatRelativeTime } from './format-relative-time'

const NOW = DateTime.fromISO('2026-08-20T09:00:00', { zone: 'Australia/Perth' })

function secondsAgo(duration: object): number {
    return Math.floor(NOW.minus(duration).toSeconds())
}

describe('formatRelativeTime', () => {
    it('returns null when there is no timestamp at all', () => {
        expect(formatRelativeTime(undefined, NOW)).toBeNull()
    })

    it('says Today for anything within the last 24 hours (or in the future)', () => {
        expect(formatRelativeTime(secondsAgo({ hours: 2 }), NOW)).toBe('Today')
        expect(formatRelativeTime(Math.floor(NOW.toSeconds()), NOW)).toBe('Today')
        expect(formatRelativeTime(Math.floor(NOW.plus({ hours: 1 }).toSeconds()), NOW)).toBe('Today')
    })

    it('says Yesterday for 1-2 days ago', () => {
        expect(formatRelativeTime(secondsAgo({ days: 1, hours: 3 }), NOW)).toBe('Yesterday')
    })

    it('counts days for under a week', () => {
        expect(formatRelativeTime(secondsAgo({ days: 3 }), NOW)).toBe('3 days ago')
        expect(formatRelativeTime(secondsAgo({ days: 6 }), NOW)).toBe('6 days ago')
    })

    it('counts weeks for under a month', () => {
        expect(formatRelativeTime(secondsAgo({ days: 7 }), NOW)).toBe('1 week ago')
        expect(formatRelativeTime(secondsAgo({ days: 20 }), NOW)).toBe('2 weeks ago')
    })

    it('counts months for under a year', () => {
        expect(formatRelativeTime(secondsAgo({ days: 30 }), NOW)).toBe('1 month ago')
        expect(formatRelativeTime(secondsAgo({ days: 100 }), NOW)).toBe('3 months ago')
    })

    it('counts years beyond a year', () => {
        expect(formatRelativeTime(secondsAgo({ days: 400 }), NOW)).toBe('1 year ago')
        expect(formatRelativeTime(secondsAgo({ days: 800 }), NOW)).toBe('2 years ago')
    })
})
