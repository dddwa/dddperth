import type { YearShortlistCounts } from './agenda-shortlist-types'

export interface ReportTalk {
    id: string
    title: string
    startsAt: string | null
    room: string | null
    speakers: string
}

export interface ShortlistReportRow {
    talkId: string
    /** Undefined for a talk that was picked and has since left the agenda. */
    talk: ReportTalk | undefined
    anonymous: number
    signedIn: number
    /** Share of all anonymous browsers that year that picked this talk, 0-1. */
    anonymousShare: number
}

export type ShortlistReportSort = 'popular' | 'time'

/**
 * One row per talk on the agenda, including talks nobody picked — an unloved
 * talk is as much a finding as a popular one — plus a row for any picked talk
 * that has since left the agenda, so no pick silently vanishes from the
 * totals.
 *
 * Rows are ranked on the anonymous count, then signed-in. The two are never
 * summed (see `TalkShortlistCount`); ranking on one then the other is the
 * closest to "most popular" that doesn't invent a blended number.
 */
export function buildShortlistReport(
    talks: readonly ReportTalk[],
    counts: YearShortlistCounts,
    sort: ShortlistReportSort,
): ShortlistReportRow[] {
    const talksById = new Map(talks.map((talk) => [talk.id, talk]))
    const ids = [...new Set([...talks.map((talk) => talk.id), ...Object.keys(counts.countsByTalkId)])]

    const rows = ids.map((talkId): ShortlistReportRow => {
        const count = counts.countsByTalkId[talkId]
        const anonymous = count?.anonymous ?? 0
        return {
            talkId,
            talk: talksById.get(talkId),
            anonymous,
            signedIn: count?.signedIn ?? 0,
            anonymousShare: counts.browsers.anonymous > 0 ? anonymous / counts.browsers.anonymous : 0,
        }
    })

    // Talks that have left the agenda have no time and sort last.
    const byTime = (a: ShortlistReportRow, b: ShortlistReportRow) => {
        const [x, y] = [a.talk?.startsAt, b.talk?.startsAt]
        if (x === y) return 0
        if (!x) return 1
        if (!y) return -1
        return x.localeCompare(y)
    }
    const byPopularity = (a: ShortlistReportRow, b: ShortlistReportRow) =>
        b.anonymous - a.anonymous || b.signedIn - a.signedIn

    return rows.sort(
        sort === 'time' ? (a, b) => byTime(a, b) || byPopularity(a, b) : (a, b) => byPopularity(a, b) || byTime(a, b),
    )
}
