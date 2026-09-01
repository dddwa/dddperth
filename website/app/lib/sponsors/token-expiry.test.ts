import { describe, expect, it } from 'vitest'
import { dueExpiryReminder, parseExpiryDate } from './token-expiry'

const DAY = 24 * 60 * 60 * 1000

describe('parseExpiryDate', () => {
    it('parses YYYY-MM-DD to end of day UTC', () => {
        const parsed = parseExpiryDate('2026-08-01')
        expect(parsed).toBe(Date.parse('2026-08-01T23:59:59Z'))
    })

    it('returns undefined for missing or unparsable values', () => {
        expect(parseExpiryDate(undefined)).toBeUndefined()
        expect(parseExpiryDate('')).toBeUndefined()
        expect(parseExpiryDate('none')).toBeUndefined()
        expect(parseExpiryDate('01/08/2026')).toBeUndefined()
        expect(parseExpiryDate('2026-13-99')).toBeUndefined()
    })
})

describe('dueExpiryReminder', () => {
    const expiresAt = Date.parse('2026-08-01T23:59:59Z')

    it('is quiet while expiry is far away', () => {
        expect(dueExpiryReminder(expiresAt, expiresAt - 45 * DAY)).toBeNull()
        expect(dueExpiryReminder(expiresAt, expiresAt - 31 * DAY)).toBeNull()
    })

    it('picks the tightest stage for the days remaining', () => {
        expect(dueExpiryReminder(expiresAt, expiresAt - 30 * DAY)?.key).toBe('jira-token-expiry:2026-08-01:30d')
        expect(dueExpiryReminder(expiresAt, expiresAt - 20 * DAY)?.key).toBe('jira-token-expiry:2026-08-01:30d')
        expect(dueExpiryReminder(expiresAt, expiresAt - 14 * DAY)?.key).toBe('jira-token-expiry:2026-08-01:14d')
        expect(dueExpiryReminder(expiresAt, expiresAt - 5 * DAY)?.key).toBe('jira-token-expiry:2026-08-01:7d')
        expect(dueExpiryReminder(expiresAt, expiresAt - 0.5 * DAY)?.key).toBe('jira-token-expiry:2026-08-01:1d')
    })

    it('reports days left and non-expired for future dates', () => {
        const reminder = dueExpiryReminder(expiresAt, expiresAt - 5 * DAY)
        expect(reminder?.daysLeft).toBe(5)
        expect(reminder?.expired).toBe(false)
    })

    it('switches to the expired notice once past', () => {
        const reminder = dueExpiryReminder(expiresAt, expiresAt + DAY)
        expect(reminder?.key).toBe('jira-token-expiry:2026-08-01:expired')
        expect(reminder?.expired).toBe(true)
    })

    it('keys include the expiry date so a replacement token restarts the cycle', () => {
        const nextYear = Date.parse('2027-08-01T23:59:59Z')
        expect(dueExpiryReminder(nextYear, nextYear - 5 * DAY)?.key).toBe('jira-token-expiry:2027-08-01:7d')
    })
})
