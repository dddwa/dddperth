import type { Year } from '../conference-state-client-safe'
import type { YearShortlistCounts } from '../agenda-shortlist-types'

/**
 * Persistence boundary for agenda shortlisting — which talks each browser has
 * added to its agenda, and the per-year counts organisers read off that.
 *
 * Domain-shaped like the other stores: the interface talks about browsers and
 * talks, not rows and cookies, so an implementation can pick its own storage.
 */
export interface AgendaShortlistStore {
    /**
     * Records that `browserId` has shortlisted `talkId`. Idempotent — calling
     * it twice for the same browser and talk leaves one pick, so a double-tap
     * or a retried request cannot inflate the count.
     */
    addPick(args: { browserId: string; year: Year; talkId: string; signedIn?: boolean }): Promise<void>

    /** Removes a pick. A no-op when the browser had not shortlisted that talk. */
    removePick(args: { browserId: string; year: Year; talkId: string }): Promise<void>

    /**
     * Every talk's counts for one year.
     *
     * Talks nobody has shortlisted are absent rather than present with zero —
     * the caller knows the full talk list from Sessionize and can fill in the
     * gaps, and returning only non-zero rows keeps this proportional to what
     * was actually picked.
     */
    getCountsForYear(year: Year): Promise<YearShortlistCounts>

    /**
     * The talk ids one browser has shortlisted for a year.
     *
     * Not used by the agenda page — that reads localStorage, which stays the
     * source of truth for a person's own picks. This exists so a browser's
     * server-side record can be reconciled with its localStorage (and, later,
     * migrated onto an account when attendee sign-in arrives).
     */
    getPicksForBrowser(args: { browserId: string; year: Year }): Promise<string[]>
}
