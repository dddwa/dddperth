/**
 * Jira API token expiry reminders — pure logic, tested in
 * token-expiry.test.ts. Atlassian doesn't expose a token's expiry through
 * any API the token can call, so the date is captured by `pnpm jira:auth`
 * (Atlassian shows it at creation time) and flows in as config.
 */

/** Days-before-expiry marks at which a reminder goes out, plus one final
 * notice once the token has actually expired. */
export const REMINDER_THRESHOLD_DAYS = [30, 14, 7, 1] as const

export interface ExpiryReminder {
    /** Dedupe key for the notification log — unique per token date + stage. */
    key: string
    /** Whole days until expiry; 0 or negative = already expired. */
    daysLeft: number
    expired: boolean
}

/**
 * Parses a YYYY-MM-DD expiry into epoch millis (end of that day UTC, so a
 * token "expiring 2026-08-01" still counts as live on the day itself).
 * Returns undefined for anything unparsable — reminders just stay off.
 */
export function parseExpiryDate(value: string | undefined): number | undefined {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return undefined
    const parsed = Date.parse(`${value.trim()}T23:59:59Z`)
    return Number.isNaN(parsed) ? undefined : parsed
}

/**
 * The reminder due right now, if any. Returns the tightest matching stage
 * (e.g. 5 days out matches the 7-day stage); the caller checks the key
 * against the notification log so each stage sends at most once. Earlier
 * stages that were never sent are superseded, not queued.
 */
export function dueExpiryReminder(expiresAtMillis: number, nowMillis: number): ExpiryReminder | null {
    const daysLeft = Math.ceil((expiresAtMillis - nowMillis) / (24 * 60 * 60 * 1000))
    const dateKey = new Date(expiresAtMillis).toISOString().slice(0, 10)

    if (daysLeft <= 0) {
        return { key: `jira-token-expiry:${dateKey}:expired`, daysLeft, expired: true }
    }

    const stage = [...REMINDER_THRESHOLD_DAYS].reverse().find((threshold) => daysLeft <= threshold)
    if (stage === undefined) return null

    return { key: `jira-token-expiry:${dateKey}:${stage}d`, daysLeft, expired: false }
}
