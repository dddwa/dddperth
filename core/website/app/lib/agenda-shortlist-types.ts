import type { Year } from './conference-state-client-safe'

/**
 * How many browsers have shortlisted one talk.
 *
 * The two figures are kept apart rather than summed because they are not the
 * same kind of number. `anonymous` is one-per-cookie-jar, so a person with a
 * phone and a laptop appears twice and a cleared cookie starts over.
 * `signedIn` will be one-per-person once attendee sign-in exists, and is
 * de-duplicated across their devices. Blending them would produce a total
 * whose reliability nobody could state.
 */
export interface TalkShortlistCount {
    talkId: string
    anonymous: number
    signedIn: number
}

/** A year's shortlist counts, keyed by Sessionize session id. */
export interface YearShortlistCounts {
    year: Year
    countsByTalkId: Record<string, TalkShortlistCount>
}
