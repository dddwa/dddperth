import { z } from 'zod'
import { conferenceTime, Temporal, tryConferenceTime } from '~/lib/dates/temporal'
import type { ConferenceEvent, EventInput } from '../services/events-store'

/**
 * Smaller events (meetups, socials, info nights) created at /admin/events,
 * listed on the home page while they're upcoming, each with a page at
 * /events/<slug> that renders the Markdown description.
 *
 * Times are entered in `datetime-local` inputs, read as conference wall time
 * (not the admin's browser's zone), and stored as offset-bearing ISO — the
 * round trip core/docs/date-time.md describes.
 */

function toIso(dateTime: Temporal.ZonedDateTime): string {
    return dateTime.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 })
}

/** ISO → the `yyyy-MM-ddTHH:mm` a `datetime-local` input takes, in conference time. */
export function toDateTimeLocal(iso: string | null | undefined): string {
    return iso ? conferenceTime(iso).toPlainDateTime().toString({ smallestUnit: 'minute' }) : ''
}

const text = (formData: FormData, name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value.trim() : ''
}

/** The admin event form → an event to save, or the problems with it. */
export function parseEventForm(formData: FormData): { value: EventInput } | { errors: string[] } {
    const errors: string[] = []

    const title = text(formData, 'title')
    if (!title) errors.push('Title is required')

    const description = text(formData, 'description')
    if (!description) errors.push('Description is required')

    const dateTime = (name: string, label: string) => {
        const raw = text(formData, name)
        if (!raw) return undefined
        const parsed = tryConferenceTime(raw)
        if (!parsed) errors.push(`${label}: not a valid date/time`)
        return parsed
    }

    const startsAt = dateTime('startsAt', 'Start')
    if (!text(formData, 'startsAt')) errors.push('Start is required')
    const endsAt = dateTime('endsAt', 'End')
    if (startsAt && endsAt && Temporal.ZonedDateTime.compare(endsAt, startsAt) <= 0) {
        errors.push('End must be after the start')
    }

    // http(s) only: these become hrefs on a public page, so `javascript:` and
    // friends must never get through.
    const httpUrl = (name: string, label: string, example: string) => {
        const raw = text(formData, name)
        if (raw && !z.url({ protocol: /^https?$/ }).safeParse(raw).success) {
            errors.push(`${label}: must be a full http(s) URL, e.g. ${example}`)
        }
        return raw
    }
    const url = httpUrl('url', 'Link', 'https://www.meetup.com/…')
    const linkLabel = text(formData, 'linkLabel')
    const location = text(formData, 'location')
    const locationUrl = httpUrl('locationUrl', 'Location link', 'https://maps.app.goo.gl/…')
    if (locationUrl && !location) errors.push('Location link: add the location name it links from')

    if (errors.length > 0 || !startsAt) return { errors }
    return {
        value: {
            title,
            description,
            startsAt: toIso(startsAt),
            endsAt: endsAt ? toIso(endsAt) : null,
            location: location || null,
            locationUrl: locationUrl || null,
            url: url || null,
            // A label with no link has nothing to label.
            linkLabel: url ? linkLabel || null : null,
            published: formData.get('published') === 'on',
        },
    }
}

/**
 * When an event stops being listed (exclusive). With no end time that's the
 * end of its start day, so an evening event doesn't vanish the moment it
 * starts.
 */
export function eventListedUntil(event: Pick<EventInput, 'startsAt' | 'endsAt'>): Temporal.ZonedDateTime {
    if (event.endsAt) return conferenceTime(event.endsAt)
    return conferenceTime(event.startsAt).add({ days: 1 }).startOfDay()
}

export type EventStatus = 'draft' | 'upcoming' | 'past'

export function eventStatus(event: ConferenceEvent, now: Temporal.ZonedDateTime): EventStatus {
    if (Temporal.ZonedDateTime.compare(now, eventListedUntil(event)) >= 0) return 'past'
    return event.published ? 'upcoming' : 'draft'
}

/** What the home page lists: published and not over, soonest first. */
export function upcomingEvents(events: ConferenceEvent[], now: Temporal.ZonedDateTime): ConferenceEvent[] {
    return events
        .filter((event) => eventStatus(event, now) === 'upcoming')
        .sort((a, b) => Temporal.ZonedDateTime.compare(conferenceTime(a.startsAt), conferenceTime(b.startsAt)))
}

/**
 * "Thursday 3 December 2026, 5:30 pm – 8:00 pm" — or, for one spanning days,
 * both full dates. Done server-side so the browser's zone can't shift it.
 */
export function formatEventWhen(event: Pick<EventInput, 'startsAt' | 'endsAt'>): string {
    const start = conferenceTime(event.startsAt)
    const date = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const
    const time = { hour: 'numeric', minute: '2-digit' } as const
    const startLabel = `${start.toLocaleString('en-AU', date)}, ${start.toLocaleString('en-AU', time)}`
    if (!event.endsAt) return startLabel
    const end = conferenceTime(event.endsAt)
    if (end.toPlainDate().equals(start.toPlainDate())) return `${startLabel} – ${end.toLocaleString('en-AU', time)}`
    return `${startLabel} – ${end.toLocaleString('en-AU', date)}, ${end.toLocaleString('en-AU', time)}`
}
