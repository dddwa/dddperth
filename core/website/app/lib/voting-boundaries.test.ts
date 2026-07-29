import { describe, expect, it } from 'vitest'
import { FairPairingGeneratorV5 } from './pairing-generator-v5'
import type { TalkPair, TalkVotingData, VotingSession } from './voting-types'
import { CURRENT_SESSION_VERSION } from './voting-version-constants'
import { extractSessionIds, getVotingBatchExplicit, hasSessionsChanged } from './voting.server'

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

/** Walks batches exactly the way the client does: each fetch continues from the last served pair. */
async function walkBatches(
    talks: TalkVotingData[],
    session: VotingSession,
    batchSize: number,
    totalPairsToServe: number,
): Promise<TalkPair[]> {
    const served: TalkPair[] = []
    let fromRound = 0
    let fromIndex = 0

    while (served.length < totalPairsToServe) {
        const batch = await getVotingBatchExplicit(talks, session, fromRound, fromIndex, batchSize)
        if (batch.pairs.length === 0) break
        served.push(...batch.pairs)
        const last = batch.pairs[batch.pairs.length - 1]
        fromRound = last.roundNumber
        fromIndex = last.index + 1
    }

    return served.slice(0, totalPairsToServe)
}

describe('round coverage guarantee (the "You have seen every talk" banner invariant)', () => {
    it('shows every talk exactly once before any round-1 pair when the talk count is even', async () => {
        const talks = makeTalks(12) // 6 pairs per round
        const session = makeSession(talks)

        // Small batches force several round-boundary continuations, like real prefetching
        const served = await walkBatches(talks, session, 5, 6 + 3)

        const round0 = served.filter((pair) => pair.roundNumber === 0)
        const firstRound1Position = served.findIndex((pair) => pair.roundNumber === 1)

        // All round-0 pairs are served before the first round-1 pair
        expect(firstRound1Position).toBe(6)

        // Round 0 covers all 12 talks exactly once
        const seen = round0.flatMap((pair) => [pair.left.id, pair.right.id])
        expect(seen).toHaveLength(12)
        expect(new Set(seen).size).toBe(12)
    })

    it('misses at most one talk in round 0 when the talk count is odd, and shows it during round 1', async () => {
        const talks = makeTalks(13) // 6 pairs per round, one talk sits out each round
        const session = makeSession(talks)

        const served = await walkBatches(talks, session, 5, 12)

        const round0Seen = new Set(
            served.filter((pair) => pair.roundNumber === 0).flatMap((pair) => [pair.left.id, pair.right.id]),
        )
        expect(round0Seen.size).toBe(12) // exactly one sit-out

        const throughRound1 = new Set(served.flatMap((pair) => [pair.left.id, pair.right.id]))
        expect(throughRound1.size).toBe(13)
    })

    it('never repeats a talk within any single round across the whole schedule', async () => {
        const talks = makeTalks(10)
        const session = makeSession(talks)
        const scheduleRounds = new FairPairingGeneratorV5(talks.length, session.seed).getScheduleRounds()

        const served = await walkBatches(talks, session, 7, scheduleRounds * session.maxPairsPerRound)

        for (let round = 0; round < scheduleRounds; round++) {
            const talkIds = served
                .filter((pair) => pair.roundNumber === round)
                .flatMap((pair) => [pair.left.id, pair.right.id])
            expect(new Set(talkIds).size).toBe(talkIds.length)
        }
    })

    it('covers every possible pair exactly once across a full schedule (even and odd counts)', async () => {
        for (const talkCount of [8, 9]) {
            const talks = makeTalks(talkCount)
            const session = makeSession(talks)
            const generator = new FairPairingGeneratorV5(talkCount, session.seed)
            const totalScheduledPairs = generator.getScheduleRounds() * generator.getMaxPairsPerRound()

            const served = await walkBatches(talks, session, 6, totalScheduledPairs)

            const keys = served.map((pair) => [pair.left.id, pair.right.id].sort().join('|'))
            expect(new Set(keys).size).toBe((talkCount * (talkCount - 1)) / 2)
        }
    })

    it('repeats the schedule (same matchings) once every combination has been shown', () => {
        const talkCount = 8
        const scheduleRounds = new FairPairingGeneratorV5(talkCount, 5).getScheduleRounds()

        const roundKey = (round: number) =>
            new FairPairingGeneratorV5(talkCount, 5, round)
                .getPairs(0, talkCount)
                .map(({ pair }) => [...pair].sort((a, b) => a - b).join('-'))
                .sort()
                .join('|')

        // "keep going and you'll get fresh match-ups" holds only within one schedule cycle
        expect(roundKey(scheduleRounds)).toBe(roundKey(0))
        expect(roundKey(scheduleRounds + 3)).toBe(roundKey(3))
    })
})

describe('getVotingBatchExplicit round boundaries', () => {
    const talks = makeTalks(10) // 5 pairs per round

    it('rolls into the next round when asked for the position exactly at the end of a round', async () => {
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, session.maxPairsPerRound, 3)

        expect(batch.pairs.map((pair) => [pair.roundNumber, pair.index])).toEqual([
            [1, 0],
            [1, 1],
            [1, 2],
        ])
        expect(batch.newRound).toBe(true)
    })

    it('serves the final pair of a round and the first of the next contiguously', async () => {
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, session.maxPairsPerRound - 1, 2)

        expect(batch.pairs.map((pair) => [pair.roundNumber, pair.index])).toEqual([
            [0, session.maxPairsPerRound - 1],
            [1, 0],
        ])
    })

    it('treats an index far beyond the end of a round as that round being complete', async () => {
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, 999, 2)

        expect(batch.pairs.map((pair) => [pair.roundNumber, pair.index])).toEqual([
            [1, 0],
            [1, 1],
        ])
    })

    it('serves valid pairs even for a round number beyond one schedule cycle (matchings wrap)', async () => {
        const session = makeSession(talks)
        const scheduleRounds = new FairPairingGeneratorV5(talks.length, session.seed).getScheduleRounds()

        const wrapped = await getVotingBatchExplicit(talks, session, scheduleRounds, 0, 5)
        const first = await getVotingBatchExplicit(talks, session, 0, 0, 5)

        // Same matching (set of pairs) as round 0; only the serving order and sides differ
        const asSet = (pairs: TalkPair[]) => pairs.map((pair) => [pair.left.id, pair.right.id].sort().join('|')).sort()
        expect(asSet(wrapped.pairs)).toEqual(asSet(first.pairs))
        expect(wrapped.pairs.every((pair) => pair.roundNumber === scheduleRounds)).toBe(true)
    })

    it('serves a single pair when asked for a batch of one at each edge of a round', async () => {
        const session = makeSession(talks)

        const lastOfRound = await getVotingBatchExplicit(talks, session, 0, session.maxPairsPerRound - 1, 1)
        expect(lastOfRound.pairs.map((pair) => [pair.roundNumber, pair.index])).toEqual([
            [0, session.maxPairsPerRound - 1],
        ])

        const firstOfNext = await getVotingBatchExplicit(talks, session, 1, 0, 1)
        expect(firstOfNext.pairs.map((pair) => [pair.roundNumber, pair.index])).toEqual([[1, 0]])
    })

    it('reports exhausted for zero and one talks', async () => {
        for (const talkCount of [0, 1]) {
            const talks = makeTalks(talkCount)
            const session = makeSession(talks)

            const batch = await getVotingBatchExplicit(talks, session, 0, 0, 5)

            expect(batch.exhausted).toBe(true)
            expect(batch.pairs).toHaveLength(0)
        }
    })

    it('handles exactly two talks: one pair per round, sides eventually vary by round shuffle', async () => {
        const talks = makeTalks(2)
        const session = makeSession(talks)

        const batch = await getVotingBatchExplicit(talks, session, 0, 0, 3)

        expect(batch.pairs).toHaveLength(3)
        for (const pair of batch.pairs) {
            expect([pair.left.id, pair.right.id].sort()).toEqual([talks[0].id, talks[1].id])
            expect(pair.index).toBe(0)
        }
        expect(batch.pairs.map((pair) => pair.roundNumber)).toEqual([0, 1, 2])
    })

    it('rotates the sit-out talk with three talks so every talk is seen within two rounds', async () => {
        const talks = makeTalks(3)
        const session = makeSession(talks)

        const served = await walkBatches(talks, session, 2, 3)

        // 3 talks -> 1 pair per round, 3 matchings; across the schedule each talk sits out exactly once
        const sitOuts = served.map((pair) => {
            const shown = new Set([pair.left.id, pair.right.id])
            return talks.find((talk) => !shown.has(talk.id))?.id
        })
        expect(new Set(sitOuts).size).toBe(3)
    })
})

describe('FairPairingGeneratorV5 input boundaries', () => {
    it('returns no pairs for out-of-range getPairs arguments', () => {
        const generator = new FairPairingGeneratorV5(10, 3)

        expect(generator.getPairs(-1, 5)).toEqual([])
        expect(generator.getPairs(0, 0)).toEqual([])
        expect(generator.getPairs(0, -2)).toEqual([])
        expect(generator.getPairs(generator.getTotalPairs(), 5)).toEqual([])
    })

    it('truncates a getPairs request that runs past the end of the round', () => {
        const generator = new FairPairingGeneratorV5(10, 3)

        const pairs = generator.getPairs(generator.getTotalPairs() - 2, 50)

        expect(pairs).toHaveLength(2)
        expect(pairs.map((pair) => pair.position)).toEqual([generator.getTotalPairs() - 2, generator.getTotalPairs() - 1])
    })

    it('flips isRoundComplete exactly at the pair count', () => {
        const generator = new FairPairingGeneratorV5(10, 3)

        expect(generator.isRoundComplete(generator.getTotalPairs() - 1)).toBe(false)
        expect(generator.isRoundComplete(generator.getTotalPairs())).toBe(true)
        expect(generator.isRoundComplete(generator.getTotalPairs() + 100)).toBe(true)
    })

    it('clamps seeds below one to the first schedule position', () => {
        const pairsFor = (seed: number) =>
            new FairPairingGeneratorV5(8, seed).getPairs(0, 8).map(({ pair }) => pair.join('-'))

        // The session counter starts at 1; 0 and negative seeds fall back to the same schedule as 1
        expect(pairsFor(0)).toEqual(pairsFor(1))
        expect(pairsFor(-5)).toEqual(pairsFor(1))
        expect(pairsFor(2)).not.toEqual(pairsFor(1))
    })
})

describe('hasSessionsChanged boundaries', () => {
    it('treats two empty talk sets as unchanged', () => {
        expect(hasSessionsChanged([], [])).toBe(false)
    })

    it('detects a talk set going from empty to populated and back', () => {
        expect(hasSessionsChanged(['a'], [])).toBe(true)
        expect(hasSessionsChanged([], ['a'])).toBe(true)
    })

    it('detects duplicated ids replacing distinct ones even at equal length', () => {
        expect(hasSessionsChanged(['a', 'a', 'b'], ['a', 'b', 'c'])).toBe(true)
    })
})
