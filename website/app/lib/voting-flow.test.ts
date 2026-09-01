import { describe, expect, it } from 'vitest'
import { FairPairingGeneratorV5 } from './pairing-generator-v5'
import type { AppServices } from './services/app-services'
import type { MappedVoteRecord } from './voting-reconstruction.server'
import { batchReconstructVoteContexts, removeVotesOnDuplicatedTalksInRound } from './voting-reconstruction.server'
import type { TalkVotingData, VoteRecord, VotingSession } from './voting-types'
import { rebuildSessionTalks } from './voting-validation.server'
import { CURRENT_SESSION_VERSION, CURRENT_VOTE_VERSION } from './voting-version-constants'
import { extractSessionIds, getVotingBatchExplicit, hasSessionsChanged, recordVoteInTable } from './voting.server'

function makeTalks(count: number): TalkVotingData[] {
    return Array.from({ length: count }, (_, index) => ({
        id: `talk-${String(index).padStart(2, '0')}`,
        title: `Talk ${index}`,
        description: null,
        tags: [],
    })).sort((a, b) => a.id.localeCompare(b.id))
}

function makeSession(talks: TalkVotingData[], overrides: Partial<VotingSession> = {}): VotingSession {
    const generator = new FairPairingGeneratorV5(talks.length, 3)
    return {
        sessionId: 'session-under-test',
        seed: 3,
        totalPairs: generator.getTotalPairs(),
        inputSessionizeTalkIdsJson: JSON.stringify(extractSessionIds(talks)),
        currentIndex: 0,
        createdAt: '2026-07-13T00:00:00.000Z',
        version: CURRENT_SESSION_VERSION,
        roundNumber: 0,
        maxPairsPerRound: generator.getMaxPairsPerRound(),
        ...overrides,
    }
}

function makeVotes(pairs: Array<{ roundNumber: number; index: number }>, sessionId: string): VoteRecord[] {
    const voteCycle = ['A', 'B', 'S'] as const
    return pairs.map((pair, index) => ({
        sessionId,
        voteVersion: CURRENT_VOTE_VERSION,
        roundNumber: pair.roundNumber,
        indexInRound: pair.index,
        vote: voteCycle[index % voteCycle.length],
        timestamp: '2026-07-13T01:00:00.000Z',
    }))
}

function makeVotingServices(session: VotingSession | null) {
    const recorded: Array<{ roundNumber: number; indexInRound: number; vote: string }> = []
    const services = {
        voting: {
            getVotingSession: () => Promise.resolve(session),
            recordVote: (vote: { roundNumber: number; indexInRound: number; vote: string }) => {
                recorded.push(vote)
                return Promise.resolve()
            },
        },
    } as unknown as AppServices
    return { services, recorded }
}

describe('getVotingBatchExplicit', () => {
    it('serves the requested number of pairs across round boundaries without repeating a talk within a round', async () => {
        const talks = makeTalks(10) // 5 pairs per round
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, 0, 12)

        expect(batch.pairs).toHaveLength(12)
        expect(batch.exhausted).toBe(false)

        const rounds = new Map<number, Array<{ index: number; talkIds: string[] }>>()
        for (const pair of batch.pairs) {
            expect(pair.left.id).not.toBe(pair.right.id)
            const round = rounds.get(pair.roundNumber) ?? []
            round.push({ index: pair.index, talkIds: [pair.left.id, pair.right.id] })
            rounds.set(pair.roundNumber, round)
        }

        // 12 pairs at 5 per round spans rounds 0, 1 and 2
        expect([...rounds.keys()].sort()).toEqual([0, 1, 2])

        for (const [, pairsInRound] of rounds) {
            // positions within a round are contiguous from the first served pair
            const indexes = pairsInRound.map((pair) => pair.index)
            const first = Math.min(...indexes)
            expect(indexes).toEqual(Array.from({ length: indexes.length }, (_, offset) => first + offset))

            // a voter never sees the same talk twice in one round
            const talkIds = pairsInRound.flatMap((pair) => pair.talkIds)
            expect(new Set(talkIds).size).toBe(talkIds.length)
        }
    })

    it('serves the same pairs when resuming mid-session as when fetching from the start', async () => {
        const talks = makeTalks(10)
        const session = makeSession(talks)

        const fullFetch = await getVotingBatchExplicit(talks, session, 0, 0, 15)
        const resumed = await getVotingBatchExplicit(talks, session, 1, 2, 5)

        const key = (pair: { roundNumber: number; index: number; left: { id: string }; right: { id: string } }) =>
            `${pair.roundNumber}:${pair.index}:${pair.left.id}:${pair.right.id}`

        const expected = fullFetch.pairs
            .filter((pair) => pair.roundNumber > 1 || (pair.roundNumber === 1 && pair.index >= 2))
            .slice(0, 5)
            .map(key)

        expect(resumed.pairs.map(key)).toEqual(expected)
    })

    it('reports exhausted when there are not enough talks to form a pair', async () => {
        const talks = makeTalks(1)
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, 0, 10)

        expect(batch.exhausted).toBe(true)
        expect(batch.pairs).toHaveLength(0)
    })
})

describe('recordVoteInTable round progression', () => {
    const talks = makeTalks(10)

    it('accepts votes in the session current round and converts skip to S', async () => {
        const session = makeSession(talks, { roundNumber: 2, currentIndex: 3 })
        const { services, recorded } = makeVotingServices(session)

        await recordVoteInTable(services, session.sessionId, '2026', 2, 4, 'skip')

        expect(recorded).toHaveLength(1)
        expect(recorded[0]).toMatchObject({ roundNumber: 2, indexInRound: 4, vote: 'S' })
    })

    it('accepts votes crossing into the next round', async () => {
        const session = makeSession(talks, { roundNumber: 2 })
        const { services, recorded } = makeVotingServices(session)

        await recordVoteInTable(services, session.sessionId, '2026', 3, 0, 'A')

        expect(recorded).toHaveLength(1)
    })

    it('rejects votes more than one round ahead of the session progress', async () => {
        const session = makeSession(talks, { roundNumber: 2 })
        const { services, recorded } = makeVotingServices(session)

        await expect(recordVoteInTable(services, session.sessionId, '2026', 4, 0, 'A')).rejects.toThrow()
        expect(recorded).toHaveLength(0)
    })

    it('rejects votes at positions outside the round', async () => {
        const session = makeSession(talks)
        const { services, recorded } = makeVotingServices(session)

        await expect(
            recordVoteInTable(services, session.sessionId, '2026', 0, session.maxPairsPerRound, 'A'),
        ).rejects.toThrow()
        await expect(recordVoteInTable(services, session.sessionId, '2026', 0, -1, 'A')).rejects.toThrow()
        expect(recorded).toHaveLength(0)
    })

    it('rejects votes for unknown sessions', async () => {
        const { services, recorded } = makeVotingServices(null)

        await expect(recordVoteInTable(services, 'missing-session', '2026', 0, 0, 'A')).rejects.toThrow()
        expect(recorded).toHaveLength(0)
    })
})

describe('vote reconstruction round trip', () => {
    it('maps every vote back to the exact pair that was served', async () => {
        const talks = makeTalks(10)
        const session = makeSession(talks)

        const served = await getVotingBatchExplicit(talks, session, 0, 0, 12)
        const votes = makeVotes(served.pairs, session.sessionId)

        const mapped = batchReconstructVoteContexts(votes, session, talks)

        expect(mapped).toHaveLength(votes.length)
        for (const vote of mapped) {
            const original = served.pairs.find(
                (pair) => pair.roundNumber === vote.roundNumber && pair.index === vote.originalVoteRecord.indexInRound,
            )
            expect(original).toBeDefined()
            expect(vote.pair.left.id).toBe(original?.left.id)
            expect(vote.pair.right.id).toBe(original?.right.id)
        }
    })

    it('keeps every position stable when a talk is later removed from the current talk list', async () => {
        const talks = makeTalks(10)
        const session = makeSession(talks)

        const served = await getVotingBatchExplicit(talks, session, 0, 0, 10)
        const votes = makeVotes(served.pairs, session.sessionId)
        const before = batchReconstructVoteContexts(votes, session, talks)

        // A talk disappears from Sessionize after votes were cast
        const removedId = talks[4].id
        const currentTalks = talks.filter((talk) => talk.id !== removedId)
        const rebuilt = rebuildSessionTalks(JSON.parse(session.inputSessionizeTalkIdsJson) as string[], currentTalks)

        // Every original position still resolves to the same talk id
        expect(rebuilt.map((talk) => talk.id)).toEqual(talks.map((talk) => talk.id))

        const after = batchReconstructVoteContexts(votes, session, rebuilt)
        expect(after.map((vote) => [vote.pair.left.id, vote.pair.right.id])).toEqual(
            before.map((vote) => [vote.pair.left.id, vote.pair.right.id]),
        )
    })

    it('preserves the stored order even when the current talk list is ordered differently', () => {
        const talks = makeTalks(6)
        const storedIds = extractSessionIds(talks)
        const shuffledCurrent = [...talks].reverse()

        const rebuilt = rebuildSessionTalks(storedIds, shuffledCurrent)

        expect(rebuilt.map((talk) => talk.id)).toEqual(storedIds)
        expect(rebuilt.map((talk) => talk.title)).toEqual(talks.map((talk) => talk.title))
    })
})

describe('removeVotesOnDuplicatedTalksInRound', () => {
    it('keeps only the earliest vote when a talk appears twice in the same round', () => {
        const talks = makeTalks(6)
        const pairFor = (index: number, left: number, right: number): MappedVoteRecord => ({
            originalVoteRecord: {
                sessionId: 'session-under-test',
                voteVersion: CURRENT_VOTE_VERSION,
                roundNumber: 0,
                indexInRound: index,
                vote: 'A',
                timestamp: '2026-07-13T01:00:00.000Z',
            },
            pair: { index, roundNumber: 0, left: talks[left], right: talks[right] },
            vote: 'A',
            timestamp: '2026-07-13T01:00:00.000Z',
            roundNumber: 0,
        })

        const cleaned = removeVotesOnDuplicatedTalksInRound([
            pairFor(0, 0, 1),
            pairFor(1, 2, 3),
            pairFor(2, 0, 4), // talk 0 again in the same round — fabricated
        ])

        expect(cleaned.map((vote) => vote.originalVoteRecord.indexInRound)).toEqual([0, 1])
    })
})

describe('hasSessionsChanged', () => {
    it('treats the same talk set in any order as unchanged', () => {
        expect(hasSessionsChanged(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(false)
    })

    it('detects added, removed and swapped talks', () => {
        expect(hasSessionsChanged(['a', 'b', 'c', 'd'], ['a', 'b', 'c'])).toBe(true)
        expect(hasSessionsChanged(['a', 'b'], ['a', 'b', 'c'])).toBe(true)
        expect(hasSessionsChanged(['a', 'b', 'x'], ['a', 'b', 'c'])).toBe(true)
    })
})
