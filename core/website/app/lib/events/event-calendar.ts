import { createEvent } from 'ics'
import { conferenceTime, Temporal } from '~/lib/dates/temporal'
import type { ConferenceEvent } from '../services/events-store'

/**
 * "Add to calendar" for an event page: an `.ics` file (Apple Calendar,
 * desktop Outlook, anything else) plus prefilled compose links for the web
 * calendars that can't open a file directly.
 *
 * Every format gets the same start, end, text and location, all from here, so
 * they can't drift apart.
 */

/**
 * An event with no end time still needs one: Google and Outlook won't create
 * an event without it. An hour is what both default to for a new event.
 */
export const DEFAULT_EVENT_DURATION = Temporal.Duration.from({ hours: 1 })

export type CalendarEvent = Pick<ConferenceEvent, 'slug' | 'title' | 'startsAt' | 'endsAt' | 'location'>

export interface CalendarEventDetails {
    slug: string
    title: string
    /** UTC, so the event lands at the right instant in any calendar's zone. */
    start: Temporal.ZonedDateTime
    end: Temporal.ZonedDateTime
    location: string | undefined
    /** The event page; the authoritative, always-current details. */
    pageUrl: string
    /** Plain text: the summary, then a link back to the page. */
    description: string
}

export function calendarEventDetails(
    event: CalendarEvent,
    { siteOrigin, summary }: { siteOrigin: string; summary: string },
): CalendarEventDetails {
    const start = conferenceTime(event.startsAt)
    const end = event.endsAt ? conferenceTime(event.endsAt) : start.add(DEFAULT_EVENT_DURATION)
    const pageUrl = `${siteOrigin}/events/${event.slug}`
    return {
        slug: event.slug,
        title: event.title,
        start: start.withTimeZone('UTC'),
        end: end.withTimeZone('UTC'),
        location: event.location ?? undefined,
        pageUrl,
        description: [summary, `Details: ${pageUrl}`].filter(Boolean).join('\n\n'),
    }
}

/** `20261203T093000Z`, the compact UTC form Google's `dates` parameter takes. */
function compactUtc(dateTime: Temporal.ZonedDateTime): string {
    return dateTime.toPlainDateTime().toString({ smallestUnit: 'second' }).replace(/[-:]/g, '').concat('Z')
}

/** `2026-12-03T09:30:00Z`, which Outlook's compose link takes. */
function isoUtc(dateTime: Temporal.ZonedDateTime): string {
    return `${dateTime.toPlainDateTime().toString({ smallestUnit: 'second' })}Z`
}

export function googleCalendarUrl(details: CalendarEventDetails): string {
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: details.title,
        dates: `${compactUtc(details.start)}/${compactUtc(details.end)}`,
        details: details.description,
    })
    if (details.location) params.set('location', details.location)
    return `https://calendar.google.com/calendar/render?${params}`
}

/**
 * Outlook's web compose link. Personal (outlook.live.com) and work/school
 * (outlook.office.com) accounts live on different hosts, and a link to the
 * wrong one asks the visitor to sign in to an account they don't have.
 */
export function outlookCalendarUrl(details: CalendarEventDetails, account: 'personal' | 'work'): string {
    const host = account === 'personal' ? 'outlook.live.com' : 'outlook.office.com'
    const params = new URLSearchParams({
        path: '/calendar/action/compose',
        rru: 'addevent',
        subject: details.title,
        startdt: isoUtc(details.start),
        enddt: isoUtc(details.end),
        body: details.description,
    })
    if (details.location) params.set('location', details.location)
    return `https://${host}/calendar/0/action/compose?${params}`
}

export function eventIcs(details: CalendarEventDetails, { productId }: { productId: string }): string {
    const toArray = (dateTime: Temporal.ZonedDateTime): [number, number, number, number, number] => [
        dateTime.year,
        dateTime.month,
        dateTime.day,
        dateTime.hour,
        dateTime.minute,
    ]
    const { error, value } = createEvent({
        productId,
        // Stable per event, so re-importing after a change updates the
        // existing entry instead of duplicating it.
        uid: `event-${details.slug}@${new URL(details.pageUrl).hostname}`,
        title: details.title,
        description: details.description,
        location: details.location,
        url: details.pageUrl,
        start: toArray(details.start),
        startInputType: 'utc',
        startOutputType: 'utc',
        end: toArray(details.end),
        endInputType: 'utc',
        endOutputType: 'utc',
    })
    if (error || !value) throw error ?? new Error('Failed to generate calendar')
    return value
}
