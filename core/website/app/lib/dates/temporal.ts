import { conferenceConfigPublic } from '@conference/config/public'
import { Temporal } from 'temporal-polyfill'

// Uses native Temporal when available and a spec-compatible implementation
// otherwise, without installing or replacing globals.
export { Temporal }

export interface ConferenceTimeOptions {
    timeZone?: string
    disambiguation?: 'compatible' | 'earlier' | 'later' | 'reject'
}

/** Calendar dates stay date-only; no host timezone or midnight instant. */
export function conferenceDate(isoDate: string): Temporal.PlainDate {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        throw new RangeError('Expected a calendar date in YYYY-MM-DD format')
    }
    return Temporal.PlainDate.from(isoDate)
}

/**
 * Interpret wall times in the configured IANA zone; preserve offset-bearing
 * instants. Date-only values have their own function so the choice is explicit.
 * Ambiguous/nonexistent local times require an explicit disambiguation policy.
 */
export function conferenceTime(
    isoDateTime: string,
    { timeZone = conferenceConfigPublic.timezone, disambiguation = 'reject' }: ConferenceTimeOptions = {},
): Temporal.ZonedDateTime {
    if (!/[Tt ]\d{2}:\d{2}/.test(isoDateTime)) {
        throw new RangeError('Expected a datetime; use conferenceDate for calendar dates')
    }
    if (isoDateTime.includes('[')) {
        return Temporal.ZonedDateTime.from(isoDateTime, { disambiguation }).withTimeZone(timeZone)
    }
    if (/(?:[Zz]|[+-]\d{2}:?\d{2})$/.test(isoDateTime)) {
        return Temporal.Instant.from(isoDateTime).toZonedDateTimeISO(timeZone)
    }
    return Temporal.PlainDateTime.from(isoDateTime).toZonedDateTime(timeZone, { disambiguation })
}
