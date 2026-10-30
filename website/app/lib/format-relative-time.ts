import type { Temporal } from '~/lib/dates/temporal'
import { conferenceInstant } from '~/lib/dates/temporal'

/**
 * Coarse "how long ago" label for a past unix-seconds timestamp — Today,
 * Yesterday, "N days ago", "N weeks ago", "N months ago", "N years ago".
 * Pure/unit-testable; used for the admin speakers table's "Last login"
 * column. `undefined` (never happened) renders as `null` so callers can
 * choose their own "Never" copy.
 */
export function formatRelativeTime(epochSeconds: number | undefined, now: Temporal.ZonedDateTime): string | null {
    if (epochSeconds === undefined) return null

    const then = conferenceInstant(epochSeconds * 1000, { timeZone: now.timeZoneId })
    const days = Math.floor(then.until(now, { largestUnit: 'day' }).total({ unit: 'day', relativeTo: then }))

    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`

    const weeks = Math.floor(days / 7)
    if (days < 30) return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`

    const months = Math.floor(days / 30)
    if (days < 365) return months === 1 ? '1 month ago' : `${months} months ago`

    const years = Math.floor(days / 365)
    return years === 1 ? '1 year ago' : `${years} years ago`
}
