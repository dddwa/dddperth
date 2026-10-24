import { conferenceTime } from '~/lib/dates/temporal'

/**
 * Whether a talk is over, so asking for feedback on it makes sense. A talk
 * with no usable end time counts as over: the feedback window itself only
 * opens on conference day, and hiding the link would leave no way to reach
 * that talk's feedback from the agenda at all.
 *
 * Sessionize times are event-local with no offset, so they're read in the
 * conference timezone; an explicit offset identifies the exact instant.
 */
export function hasTalkEnded(endsAt: string | null | undefined, nowMillis: number, timezone?: string): boolean {
    if (!endsAt) return true
    try {
        const end = conferenceTime(endsAt, { timeZone: timezone })
        return end.epochMilliseconds <= nowMillis
    } catch {
        return true
    }
}
