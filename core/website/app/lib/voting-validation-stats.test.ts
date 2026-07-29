import { describe, expect, it } from 'vitest'
import type { TalkVotingData } from './voting-types'
import { computeTalkStatsFromVoteRows, type VoteResultStatsRow } from './voting-validation.server'
import { CURRENT_SESSION_VERSION } from './voting-version-constants'

function makeTalks(ids: string[]): TalkVotingData[] {
    return ids.map((id) => ({ id, title: `Talk ${id}`, description: null, tags: [] }))
}

function statsFor(stats: ReturnType<typeof computeTalkStatsFromVoteRows>, talkId: string) {
    const talkStats = stats.get(talkId)
    if (!talkStats) throw new Error(`No stats for ${talkId}`)
    return talkStats
}

type StatField = 'timesSeen' | 'timesVotedFor' | 'timesVotedAgainst' | 'timesSkipped'
const versionKey = (field: StatField) => `${field}V${CURRENT_SESSION_VERSION}` as const

describe('computeTalkStatsFromVoteRows', () => {
    it('counts seen/for/against/skip per talk, mirrored into the current session version columns', () => {
        const talks = makeTalks(['talk-a', 'talk-b', 'talk-c'])
        const rows: VoteResultStatsRow[] = [
            { talkA: 'talk-a', talkB: 'talk-b', vote: 'a' },
            { talkA: 'talk-b', talkB: 'talk-c', vote: 'b' },
            { talkA: 'talk-a', talkB: 'talk-c', vote: 'skip' },
        ]

        const stats = computeTalkStatsFromVoteRows(rows, talks)

        const talkA = statsFor(stats, 'talk-a')
        expect(talkA.timesSeenAggregated).toBe(2)
        expect(talkA.timesVotedForAggregated).toBe(1)
        expect(talkA.timesVotedAgainstAggregated).toBe(0)
        expect(talkA.timesSkippedAggregated).toBe(1)

        const talkB = statsFor(stats, 'talk-b')
        expect(talkB.timesSeenAggregated).toBe(2)
        expect(talkB.timesVotedForAggregated).toBe(0)
        expect(talkB.timesVotedAgainstAggregated).toBe(2)
        expect(talkB.timesSkippedAggregated).toBe(0)

        const talkC = statsFor(stats, 'talk-c')
        expect(talkC.timesSeenAggregated).toBe(2)
        expect(talkC.timesVotedForAggregated).toBe(1)
        expect(talkC.timesVotedAgainstAggregated).toBe(0)
        expect(talkC.timesSkippedAggregated).toBe(1)

        // Version columns mirror the aggregated counts (all counted rows come
        // from CURRENT_SESSION_VERSION sessions)
        expect(talkA[versionKey('timesSeen')]).toBe(2)
        expect(talkA[versionKey('timesVotedFor')]).toBe(1)
        expect(talkA[versionKey('timesSkipped')]).toBe(1)
        expect(talkB[versionKey('timesVotedAgainst')]).toBe(2)
    })

    it('returns zeroed rows for talks that never appeared in a vote', () => {
        const talks = makeTalks(['talk-a', 'talk-b'])

        const stats = computeTalkStatsFromVoteRows([], talks)

        expect(stats.size).toBe(2)
        const talkA = statsFor(stats, 'talk-a')
        expect(talkA.title).toBe('Talk talk-a')
        expect(talkA.timesSeenAggregated).toBe(0)
        expect(talkA.timesVotedForAggregated).toBe(0)
    })

    it('excludes pairs where either side is an unknown (removed) talk', () => {
        const talks = makeTalks(['talk-a', 'talk-b'])
        const rows: VoteResultStatsRow[] = [
            { talkA: 'talk-a', talkB: 'talk-removed', vote: 'a' },
            { talkA: 'talk-removed', talkB: 'talk-b', vote: 'b' },
            { talkA: 'talk-a', talkB: 'talk-b', vote: 'a' },
        ]

        const stats = computeTalkStatsFromVoteRows(rows, talks)

        // Only the known-vs-known pair counts; the known side of a removed
        // pair gets nothing (same semantics as the original per-vote
        // accumulation)
        const talkA = statsFor(stats, 'talk-a')
        expect(talkA.timesSeenAggregated).toBe(1)
        expect(talkA.timesVotedForAggregated).toBe(1)

        const talkB = statsFor(stats, 'talk-b')
        expect(talkB.timesSeenAggregated).toBe(1)
        expect(talkB.timesVotedAgainstAggregated).toBe(1)

        expect(stats.has('talk-removed')).toBe(false)
    })

    it('counts duplicate rows once each — dedupe happens at the vote_results table, not here', () => {
        const talks = makeTalks(['talk-a', 'talk-b'])
        const rows: VoteResultStatsRow[] = [
            { talkA: 'talk-a', talkB: 'talk-b', vote: 'a' },
            { talkA: 'talk-a', talkB: 'talk-b', vote: 'a' },
        ]

        const stats = computeTalkStatsFromVoteRows(rows, talks)

        expect(statsFor(stats, 'talk-a').timesSeenAggregated).toBe(2)
    })
})
