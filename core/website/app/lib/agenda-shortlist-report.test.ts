import { describe, expect, it } from 'vitest'
import { type ReportTalk, buildShortlistReport } from './agenda-shortlist-report'
import type { YearShortlistCounts } from './agenda-shortlist-types'

const talk = (id: string, startsAt: string): ReportTalk => ({
    id,
    title: `Talk ${id}`,
    startsAt: `2026-09-20T${startsAt}:00`,
    room: 'Room',
    speakers: '',
})

const talks = [talk('early', '09:00'), talk('late', '14:00'), talk('mid', '11:00')]

const counts = (
    countsByTalkId: YearShortlistCounts['countsByTalkId'],
    browsers = { anonymous: 10, signedIn: 0 },
): YearShortlistCounts => ({ year: '2026', countsByTalkId, browsers })

describe('buildShortlistReport', () => {
    it('includes talks nobody picked, with zero counts', () => {
        const rows = buildShortlistReport(talks, counts({}), 'popular')

        expect(rows.map((row) => [row.talkId, row.anonymous])).toEqual([
            ['early', 0],
            ['mid', 0],
            ['late', 0],
        ])
    })

    it('ranks by anonymous count, then signed-in, then time', () => {
        const rows = buildShortlistReport(
            talks,
            counts({
                late: { talkId: 'late', anonymous: 5, signedIn: 0 },
                mid: { talkId: 'mid', anonymous: 5, signedIn: 2 },
                early: { talkId: 'early', anonymous: 1, signedIn: 9 },
            }),
            'popular',
        )

        expect(rows.map((row) => row.talkId)).toEqual(['mid', 'late', 'early'])
    })

    it('can order by time instead', () => {
        const rows = buildShortlistReport(
            talks,
            counts({ late: { talkId: 'late', anonymous: 5, signedIn: 0 } }),
            'time',
        )

        expect(rows.map((row) => row.talkId)).toEqual(['early', 'mid', 'late'])
    })

    it('never sums the two counts into one figure', () => {
        const [row] = buildShortlistReport(
            [talk('only', '09:00')],
            counts({ only: { talkId: 'only', anonymous: 3, signedIn: 4 } }),
            'popular',
        )

        expect(row).toMatchObject({ anonymous: 3, signedIn: 4 })
        expect(Object.values(row)).not.toContain(7)
    })

    it('reads each count against how many browsers picked anything', () => {
        const [row] = buildShortlistReport(
            [talk('only', '09:00')],
            counts({ only: { talkId: 'only', anonymous: 3, signedIn: 0 } }, { anonymous: 12, signedIn: 0 }),
            'popular',
        )

        expect(row.anonymousShare).toBe(0.25)
    })

    it('reports a zero share rather than dividing by zero', () => {
        const [row] = buildShortlistReport(
            [talk('only', '09:00')],
            counts({}, { anonymous: 0, signedIn: 0 }),
            'popular',
        )

        expect(row.anonymousShare).toBe(0)
    })

    it('keeps picks for a talk that has left the agenda, last when ordered by time', () => {
        const rows = buildShortlistReport(
            talks,
            counts({ withdrawn: { talkId: 'withdrawn', anonymous: 2, signedIn: 0 } }),
            'time',
        )

        expect(rows.at(-1)).toMatchObject({ talkId: 'withdrawn', talk: undefined, anonymous: 2 })
    })
})
