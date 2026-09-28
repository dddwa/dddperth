import type { ConferenceVenue } from '@ddd/conference-config'
import { createEvents, type EventAttributes } from 'ics'
import { DateTime } from 'luxon'
import type { z } from 'zod'
import type { sessionSchema } from '~/lib/sessionize.server'

type Session = z.infer<typeof sessionSchema>

/**
 * More than anyone could attend in a day, with room to spare for a multi-day
 * conference. Bounds the work one request can ask for.
 */
export const MAX_CALENDAR_TALKS = 100

const TALK_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/

/**
 * Talk ids from the `?talks=` query. Anything malformed is dropped rather than
 * rejected: these come from a person's localStorage, which may hold stale ids,
 * and one bad entry shouldn't cost them the rest of their calendar.
 */
export function parseRequestedTalkIds(raw: string | null): string[] {
    if (!raw) return []
    const ids = raw
        .split(',')
        .map((id) => id.trim())
        .filter((id) => TALK_ID_PATTERN.test(id))
    return [...new Set(ids)].slice(0, MAX_CALENDAR_TALKS)
}

/**
 * The `.ics` for a person's picked talks.
 *
 * `talks` must be the *published* agenda's talks (see
 * `getPublishedSchedule`). The requested ids only ever filter that list — they
 * are never looked up anywhere else — so this can emit nothing that isn't
 * already on the public agenda, whatever ids a caller sends. Returns
 * `undefined` when none of the requested ids is on it.
 */
export function buildMyAgendaCalendar(args: {
    talks: readonly Session[]
    requestedIds: readonly string[]
    timezone: string
    conferenceName: string
    year: string
    siteOrigin: string
    venue: ConferenceVenue | undefined
}): string | undefined {
    const requested = new Set(args.requestedIds)
    const picked = args.talks
        .filter((talk) => requested.has(talk.id) && talk.startsAt && talk.endsAt)
        .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''))
    if (picked.length === 0) return undefined

    const events = picked.map((talk): EventAttributes => {
        // Sessionize times are conference-local wall-clock times. Emit UTC so
        // the event lands at the right instant for someone whose calendar is
        // set to another timezone.
        const start = DateTime.fromISO(talk.startsAt as string, { zone: args.timezone }).toUTC()
        const end = DateTime.fromISO(talk.endsAt as string, { zone: args.timezone }).toUTC()
        const url = `${args.siteOrigin}/agenda/${args.year}/talk/${talk.id}`
        const speakers = talk.speakers.map((speaker) => speaker.name).join(', ')

        return {
            // Stable per talk, so re-importing after changing picks updates
            // the existing events instead of duplicating them.
            uid: `${args.year}-${talk.id}@${new URL(args.siteOrigin).hostname}`,
            title: talk.title,
            description: [speakers, url].filter(Boolean).join('\n\n'),
            location: [talk.room, args.venue?.name].filter(Boolean).join(', '),
            url,
            start: [start.year, start.month, start.day, start.hour, start.minute],
            startInputType: 'utc',
            startOutputType: 'utc',
            end: [end.year, end.month, end.day, end.hour, end.minute],
            endInputType: 'utc',
            endOutputType: 'utc',
        }
    })

    const { error, value } = createEvents(events, {
        productId: args.conferenceName,
        calName: `${args.conferenceName} ${args.year} - my agenda`,
    })
    if (error || !value) {
        throw error ?? new Error('Failed to generate calendar')
    }
    return value
}
