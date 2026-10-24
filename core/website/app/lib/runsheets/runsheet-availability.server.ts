import { conferenceDayStart, Temporal } from '~/lib/dates/temporal'
import { getConferenceState, getDateTimeProvider } from '~/remix-app-load-context'

/**
 * Whether the run sheets have closed for the year: from the Monday after the
 * conference until the next conference is configured. A phone or kiosk left
 * open on the page polls the server every minute, and once the weekend is
 * over that polling is only spending Jira and Sessionize calls on a run sheet
 * nobody needs.
 *
 * The end of the conference's ISO week (Monday–Sunday), so bump-out on the
 * Sunday still has it. Open when there's no conference date to measure from.
 */
export function isRunsheetClosed(conferenceDate: string | undefined, now: Temporal.ZonedDateTime, timezone?: string): boolean {
    if (!conferenceDate) return false
    const date = conferenceDayStart(conferenceDate, { timeZone: timezone })
    const nextMonday = date.add({ days: 8 - date.dayOfWeek }).startOfDay()
    return Temporal.ZonedDateTime.compare(now, nextMonday) >= 0
}

type Context = Parameters<typeof getConferenceState>[0]

/** `isRunsheetClosed` for this request's conference and clock (which honours the admin date override). */
export function isRunsheetClosedNow(context: Context): boolean {
    const { conference } = getConferenceState(context)
    const now = getDateTimeProvider(context).nowDate()
    return isRunsheetClosed(conference.date, now)
}

/** 404s a run sheet route once closed, before anything reaches Jira. */
export function requireRunsheetOpen(context: Context): void {
    if (isRunsheetClosedNow(context)) {
        throw new Response('Not Found', { status: 404 })
    }
}
