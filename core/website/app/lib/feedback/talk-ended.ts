import { DateTime } from 'luxon'

/**
 * Whether a talk is over, so asking for feedback on it makes sense. A talk
 * with no usable end time counts as over: the feedback window itself only
 * opens on conference day, and hiding the link would leave no way to reach
 * that talk's feedback from the agenda at all.
 *
 * Sessionize times are event-local with no offset, so they're read in the
 * conference timezone; one that does carry an offset keeps it.
 */
export function hasTalkEnded(endsAt: string | null | undefined, nowMillis: number, timezone: string): boolean {
    if (!endsAt) return true
    // The app sets `Settings.throwOnInvalid` (app/root.tsx), so a bad value
    // throws rather than coming back invalid.
    try {
        const end = DateTime.fromISO(endsAt, { zone: timezone })
        return !end.isValid || end.toMillis() <= nowMillis
    } catch {
        return true
    }
}
