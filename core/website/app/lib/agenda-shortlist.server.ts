import { recordException } from './record-exception'
import type { Year } from './conference-state-client-safe'
import type { TalkShortlistCount, YearShortlistCounts } from './agenda-shortlist-types'

/**
 * D1 access for agenda shortlisting. Reached through
 * `context.services.agendaShortlist`, not imported by routes directly.
 */

interface ShortlistCountRow {
    talk_id: string
    signed_in: number
    n: number
}

export async function addShortlistPick(
    db: D1Database,
    args: { browserId: string; year: Year; talkId: string; signedIn?: boolean },
): Promise<void> {
    const { browserId, year, talkId, signedIn = false } = args

    try {
        await db
            .prepare(
                // Idempotent by primary key. A repeat add from the same browser
                // refreshes signed_in (so signing in upgrades an existing pick)
                // but leaves created_at alone — the first time they chose it is
                // the interesting timestamp, not the last time they re-tapped.
                `INSERT INTO agenda_shortlist_picks (browser_id, year, talk_id, signed_in, created_at)
                 VALUES (?, ?, ?, ?, ?)
                 ON CONFLICT(browser_id, year, talk_id) DO UPDATE SET
                     signed_in = excluded.signed_in`,
            )
            .bind(browserId, year, talkId, signedIn ? 1 : 0, Date.now())
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function removeShortlistPick(
    db: D1Database,
    args: { browserId: string; year: Year; talkId: string },
): Promise<void> {
    try {
        await db
            .prepare(`DELETE FROM agenda_shortlist_picks WHERE browser_id = ? AND year = ? AND talk_id = ?`)
            .bind(args.browserId, args.year, args.talkId)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function getShortlistCountsForYear(db: D1Database, year: Year): Promise<YearShortlistCounts> {
    try {
        // Grouping by signed_in rather than summing a CASE keeps the two
        // figures structurally separate all the way out of the database —
        // there is no point at which a single blended total exists.
        const { results } = await db
            .prepare(
                `SELECT talk_id, signed_in, COUNT(*) AS n
                 FROM agenda_shortlist_picks
                 WHERE year = ?
                 GROUP BY talk_id, signed_in`,
            )
            .bind(year)
            .all<ShortlistCountRow>()

        const countsByTalkId: Record<string, TalkShortlistCount> = {}

        for (const row of results ?? []) {
            const entry = (countsByTalkId[row.talk_id] ??= {
                talkId: row.talk_id,
                anonymous: 0,
                signedIn: 0,
            })

            if (row.signed_in === 1) {
                entry.signedIn = row.n
            } else {
                entry.anonymous = row.n
            }
        }

        return { year, countsByTalkId }
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function getShortlistPicksForBrowser(
    db: D1Database,
    args: { browserId: string; year: Year },
): Promise<string[]> {
    try {
        const { results } = await db
            .prepare(`SELECT talk_id FROM agenda_shortlist_picks WHERE browser_id = ? AND year = ?`)
            .bind(args.browserId, args.year)
            .all<{ talk_id: string }>()

        return (results ?? []).map((row) => row.talk_id)
    } catch (error: any) {
        recordException(error)
        throw error
    }
}
