import { Temporal } from '~/lib/dates/temporal'

export type OpenWindowStatus = 'upcoming' | 'open' | 'closed'

/**
 * Where `now` falls in a form's entry window: open from `opens` (inclusive)
 * until `closes` (exclusive). Shared by competitions and surveys.
 */
export function openWindowStatus(
    window: { opens: Temporal.ZonedDateTime; closes: Temporal.ZonedDateTime },
    now: Temporal.ZonedDateTime,
): OpenWindowStatus {
    if (Temporal.ZonedDateTime.compare(now, window.opens) < 0) return 'upcoming'
    if (Temporal.ZonedDateTime.compare(now, window.closes) >= 0) return 'closed'
    return 'open'
}
