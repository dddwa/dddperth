import { DateTime } from 'luxon'

/** Something an attendee can leave session feedback on: a talk, or a Meet the Experts seat. */
export interface FeedbackTarget {
    /** The Sessionize session id, or a Meet the Experts `mte-…` id. Stored with each response. */
    id: string
    kind: 'talk' | 'meet-the-experts'
    title: string
    speakers: string
    /** `h:mm am`, or '' when the time isn't known. */
    time: string
    room: string
    /** What the dropdown shows: `10:30 am – Talk title`. */
    label: string
}

export interface FeedbackTalkInput {
    id: string
    title: string
    /** Sessionize's local ISO datetime (`2026-10-03T10:30:00`). */
    startsAt: string | null
    room: string | null
    speakers: Array<{ name: string }>
}

export interface FeedbackMeetTheExpertsInput {
    tableLabels: string[]
    rows: Array<{
        slotLabel: string
        cells: Array<{ displayName: string; feedbackId: string } | null>
    }>
}

/**
 * Talks and Meet the Experts registrants, merged into one list sorted
 * chronologically, then by title. The dropdown text starts with the time, so
 * this reads as "sorted by the dropdown text" — but by the clock, so 9:00 am
 * comes before 10:30 am, which a plain string sort wouldn't do.
 *
 * Someone seated at Meet the Experts in several slots is listed once, at their
 * first slot: feedback follows the person, not the seat.
 */
export function buildFeedbackTargets(
    talks: FeedbackTalkInput[],
    meetTheExperts: FeedbackMeetTheExpertsInput | undefined,
    timezone: string,
): FeedbackTarget[] {
    const entries: Array<FeedbackTarget & { sortTime: string }> = []

    for (const talk of talks) {
        const start = talk.startsAt ? DateTime.fromISO(talk.startsAt, { zone: timezone }) : undefined
        const time = start?.isValid ? start.toFormat('h:mm a').toLowerCase() : ''
        entries.push({
            id: talk.id,
            kind: 'talk',
            title: talk.title,
            speakers: talk.speakers.map((speaker) => speaker.name).join(', '),
            time,
            room: talk.room ?? '',
            label: time ? `${time} – ${talk.title}` : talk.title,
            sortTime: start?.isValid ? start.toFormat('HH:mm') : '99:99',
        })
    }

    const seen = new Set<string>()
    for (const row of meetTheExperts?.rows ?? []) {
        const start = parseSlotStart(row.slotLabel)
        row.cells.forEach((seat, i) => {
            if (!seat || seen.has(seat.feedbackId)) return
            seen.add(seat.feedbackId)
            const title = `Meet the Experts: ${seat.displayName}`
            const time = start ? start.toFormat('h:mm a').toLowerCase() : ''
            entries.push({
                id: seat.feedbackId,
                kind: 'meet-the-experts',
                title,
                speakers: seat.displayName,
                time,
                room: meetTheExperts?.tableLabels[i] ?? '',
                label: time ? `${time} – ${title}` : title,
                sortTime: start ? start.toFormat('HH:mm') : '99:99',
            })
        })
    }

    return entries
        .sort((a, b) => a.sortTime.localeCompare(b.sortTime) || a.title.localeCompare(b.title))
        .map(({ sortTime: _, ...target }) => target)
}

/**
 * Meet the Experts slot labels are free text typed into admin settings
 * ("10:30am – 11:25am"). The first time in the label is taken as the start.
 */
function parseSlotStart(label: string): DateTime | undefined {
    const match = label.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i)
    if (!match) return undefined
    const hour12 = Number(match[1]) % 12
    const hour = match[3].toLowerCase() === 'pm' ? hour12 + 12 : hour12
    const parsed = DateTime.fromObject({ hour, minute: Number(match[2] ?? 0) })
    return parsed.isValid ? parsed : undefined
}
