import type { Temporal as TemporalTypes } from 'temporal-polyfill'

// Module initialization waits only when a fallback is needed. Keeping the
// import inside this branch lets browsers with native Temporal skip its chunk.
const nativeTemporal = (globalThis as typeof globalThis & { Temporal?: typeof TemporalTypes }).Temporal
export const Temporal: typeof TemporalTypes = nativeTemporal ?? (await import('temporal-polyfill')).Temporal

// Preserve the standard instance types alongside the selected constructors.
export declare namespace Temporal {
    type Duration = TemporalTypes.Duration
    type Instant = TemporalTypes.Instant
    type PlainDate = TemporalTypes.PlainDate
    type PlainDateTime = TemporalTypes.PlainDateTime
    type PlainMonthDay = TemporalTypes.PlainMonthDay
    type PlainTime = TemporalTypes.PlainTime
    type PlainYearMonth = TemporalTypes.PlainYearMonth
    type ZonedDateTime = TemporalTypes.ZonedDateTime
}

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
function parseConferenceTime(
    isoDateTime: string,
    { timeZone, disambiguation = 'reject' }: ConferenceTimeOptions & { timeZone: string },
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

/** Bind conference-local constructors once, without importing the manifest. */
export function createConferenceDates(timeZone: string) {
    return {
        conferenceTime(value: string, options: ConferenceTimeOptions = {}): Temporal.ZonedDateTime {
            return parseConferenceTime(value, { ...options, timeZone: options.timeZone ?? timeZone })
        },
        conferenceDayStart(value: string, options: Pick<ConferenceTimeOptions, 'timeZone'> = {}): Temporal.ZonedDateTime {
            return conferenceDate(value).toZonedDateTime(options.timeZone ?? timeZone)
        },
        conferenceInstant(epochMilliseconds: number, options: Pick<ConferenceTimeOptions, 'timeZone'> = {}): Temporal.ZonedDateTime {
            return Temporal.Instant.fromEpochMilliseconds(epochMilliseconds).toZonedDateTimeISO(options.timeZone ?? timeZone)
        },
    }
}
