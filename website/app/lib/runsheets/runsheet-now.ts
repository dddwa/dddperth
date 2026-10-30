import { conferenceTime } from '~/lib/dates/temporal'
/**
 * Which run sheet rows are happening now. Client-safe: the page works it out
 * in the browser against the request provider clock, so the highlight moves
 * through the day without a reload.
 */
import type { RunsheetItem } from './runsheet-filters'

/**
 * How long a row with a start but no end counts as "now". Jira items often
 * carry only a start (a door opening, a call to the room), and treating them
 * as instants would mean they are never highlighted at all.
 */
export const OPEN_ENDED_ITEM_MINUTES = 15

/**
 * Zoned explicitly: agenda sessions come from Sessionize as local times with
 * no offset, which would otherwise be read in the device's own timezone.
 */
function toMillis(isoDateTime: string | null, timezone: string | undefined): number | null {
    if (!isoDateTime) return null
    try {
        return conferenceTime(isoDateTime, { timeZone: timezone }).epochMilliseconds
    } catch {
        return null
    }
}

/** Started, and not yet finished: start inclusive, end exclusive. */
export function isRunsheetItemNow(
    item: Pick<RunsheetItem, 'startTime' | 'endTime'>,
    nowMillis: number,
    timezone?: string,
): boolean {
    const start = toMillis(item.startTime, timezone)
    if (start === null) return false
    const end = toMillis(item.endTime, timezone) ?? start + OPEN_ENDED_ITEM_MINUTES * 60_000
    return start <= nowMillis && nowMillis < end
}
