import { describe, expect, it } from 'vitest'
import { FairPairingGeneratorV5 } from './pairing-generator-v5'

function canonicalPair([left, right]: [number, number]): string {
    return `${Math.min(left, right)}-${Math.max(left, right)}`
}

function expectNoTalkRepeats(pairs: Array<[number, number]>, talksCount: number) {
    const seenTalks = new Set<number>()

    for (const [left, right] of pairs) {
        expect(left).toBeGreaterThanOrEqual(0)
        expect(left).toBeLessThan(talksCount)
        expect(right).toBeGreaterThanOrEqual(0)
        expect(right).toBeLessThan(talksCount)
        expect(left).not.toBe(right)
        expect(seenTalks.has(left)).toBe(false)
        expect(seenTalks.has(right)).toBe(false)
        seenTalks.add(left)
        seenTalks.add(right)
    }
}

describe('FairPairingGeneratorV5', () => {
    it('creates one no-repeat pass for an even number of talks', () => {
        const generator = new FairPairingGeneratorV5(10, 1)
        const pairs = generator.getPairs(0, 20)

        expect(generator.getTotalPairs()).toBe(5)
        expect(generator.getMaxPairsPerRound()).toBe(5)
        expect(pairs).toHaveLength(5)
        expect(pairs.map((pair) => pair.position)).toEqual([0, 1, 2, 3, 4])
        expectNoTalkRepeats(
            pairs.map((pair) => pair.pair),
            10,
        )
    })

    it('creates one no-repeat pass with one bye for an odd number of talks', () => {
        const generator = new FairPairingGeneratorV5(7, 1)
        const pairs = generator.getPairs(0, 20)

        expect(generator.getTotalPairs()).toBe(3)
        expect(generator.getMaxPairsPerRound()).toBe(3)
        expect(pairs).toHaveLength(3)
        expectNoTalkRepeats(
            pairs.map((pair) => pair.pair),
            7,
        )
    })

    it('returns deterministic positions when fetching from the middle of a session', () => {
        const generator = new FairPairingGeneratorV5(12, 42)

        const firstBatch = generator.getPairs(0, 3)
        const secondBatch = generator.getPairs(3, 3)
        const fullBatch = generator.getPairs(0, 6)

        expect(firstBatch.map((pair) => pair.position)).toEqual([0, 1, 2])
        expect(secondBatch.map((pair) => pair.position)).toEqual([3, 4, 5])
        expect([...firstBatch, ...secondBatch]).toEqual(fullBatch)
    })

    it('does not roll beyond the single no-repeat pass', () => {
        const generator = new FairPairingGeneratorV5(6, 1)

        expect(generator.isRoundComplete(2)).toBe(false)
        expect(generator.isRoundComplete(3)).toBe(true)
        expect(generator.getPairs(3, 1)).toEqual([])
    })

    it('generates different no-repeat pairings for later voting rounds', () => {
        const firstRound = new FairPairingGeneratorV5(10, 1, 0)
            .getPairs(0, 5)
            .map((pair) => canonicalPair(pair.pair))
        const secondRound = new FairPairingGeneratorV5(10, 1, 1)
            .getPairs(0, 5)
            .map((pair) => canonicalPair(pair.pair))

        expect(new Set(firstRound).size).toBe(firstRound.length)
        expect(new Set(secondRound).size).toBe(secondRound.length)
        expectNoTalkRepeats(
            new FairPairingGeneratorV5(10, 1, 1).getPairs(0, 5).map((pair) => pair.pair),
            10,
        )
        expect(secondRound.some((pair) => !firstRound.includes(pair))).toBe(true)
    })

    it('covers every possible pair once across a full even-talk schedule', () => {
        const talksCount = 8
        const scheduleRounds = talksCount - 1
        const seenPairs = new Map<string, number>()
        const appearances = new Array(talksCount).fill(0)

        for (let seed = 1; seed <= scheduleRounds; seed++) {
            const generator = new FairPairingGeneratorV5(talksCount, seed)
            const pairs = generator.getPairs(0, generator.getTotalPairs()).map((pair) => pair.pair)

            expectNoTalkRepeats(pairs, talksCount)

            for (const pair of pairs) {
                seenPairs.set(canonicalPair(pair), (seenPairs.get(canonicalPair(pair)) ?? 0) + 1)
                appearances[pair[0]]++
                appearances[pair[1]]++
            }
        }

        expect(seenPairs.size).toBe((talksCount * (talksCount - 1)) / 2)
        expect([...seenPairs.values()]).toEqual(new Array(seenPairs.size).fill(1))
        expect(appearances).toEqual(new Array(talksCount).fill(scheduleRounds))
    })

    it('covers every possible pair once across a full odd-talk schedule', () => {
        const talksCount = 7
        const scheduleRounds = talksCount
        const seenPairs = new Map<string, number>()
        const appearances = new Array(talksCount).fill(0)

        for (let seed = 1; seed <= scheduleRounds; seed++) {
            const generator = new FairPairingGeneratorV5(talksCount, seed)
            const pairs = generator.getPairs(0, generator.getTotalPairs()).map((pair) => pair.pair)

            expectNoTalkRepeats(pairs, talksCount)

            for (const pair of pairs) {
                seenPairs.set(canonicalPair(pair), (seenPairs.get(canonicalPair(pair)) ?? 0) + 1)
                appearances[pair[0]]++
                appearances[pair[1]]++
            }
        }

        expect(seenPairs.size).toBe((talksCount * (talksCount - 1)) / 2)
        expect([...seenPairs.values()]).toEqual(new Array(seenPairs.size).fill(1))
        expect(appearances).toEqual(new Array(talksCount).fill(talksCount - 1))
    })

    it('keeps early partial-session exposure well distributed', () => {
        const talksCount = 250
        const sessionsCount = 1000
        const pairsPerSession = 50
        const appearances = new Array(talksCount).fill(0)

        for (let seed = 1; seed <= sessionsCount; seed++) {
            const pairs = new FairPairingGeneratorV5(talksCount, seed).getPairs(0, pairsPerSession)

            for (const { pair } of pairs) {
                appearances[pair[0]]++
                appearances[pair[1]]++
            }
        }

        const averageAppearances = appearances.reduce((sum, count) => sum + count, 0) / talksCount
        const variance =
            appearances.reduce((sum, count) => sum + Math.pow(count - averageAppearances, 2), 0) / talksCount
        const coefficientOfVariation = Math.sqrt(variance) / averageAppearances

        expect(Math.max(...appearances) - Math.min(...appearances)).toBeLessThanOrEqual(100)
        expect(coefficientOfVariation).toBeLessThan(0.05)
    })
})
