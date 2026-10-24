import type { Temporal } from '~/lib/dates/temporal'
import { createEvent } from 'ics'

/**
 * Builds a downloadable "Add to calendar" link for an RSVP'd event
 * (speaker training session, speaker dinner). `start`/`end` are converted to
 * UTC before handing off to `ics` so the invite lands at the right instant
 * regardless of the recipient's own timezone — these are Perth-specific
 * events, so a floating/local-time invite would be wrong for anyone viewing
 * it outside `Australia/Perth`.
 */
export function buildCalendarDataUrl(event: {
    title: string
    description?: string
    start: Temporal.ZonedDateTime
    end: Temporal.ZonedDateTime
    location?: string
}): string {
    const startUtc = event.start.withTimeZone('UTC')
    const endUtc = event.end.withTimeZone('UTC')

    const { error, value } = createEvent({
        title: event.title,
        description: event.description,
        location: event.location,
        start: [startUtc.year, startUtc.month, startUtc.day, startUtc.hour, startUtc.minute],
        startInputType: 'utc',
        startOutputType: 'utc',
        end: [endUtc.year, endUtc.month, endUtc.day, endUtc.hour, endUtc.minute],
        endInputType: 'utc',
        endOutputType: 'utc',
    })

    if (error || !value) {
        throw error ?? new Error('Failed to generate calendar event')
    }

    return `data:text/calendar;charset=utf8,${encodeURIComponent(value)}`
}
