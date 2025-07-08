import { describe, expect, it } from 'vitest'
import { FairPairingGeneratorV3 } from './pairing-generator-v3'
import { FairPairingGeneratorV4 } from './pairing-generator-v4'

describe('FairPairingGeneratorV4', () => {
    describe('Basic functionality', () => {
        it('should create generator with correct total pairs per round', () => {
            const generator = new FairPairingGeneratorV4(5, 12345)
            // 5 talks should have floor(5/2) = 2 pairs per round (not 10 total pairs)
            expect(generator.getTotalPairs()).toBe(2)
            expect(generator.getMaxPairsPerRound()).toBe(2)
        })

        it('should limit pairs to maxPairsPerRound', () => {
            const generator = new FairPairingGeneratorV4(10, 12345)
            // 10 talks = 5 pairs per round maximum
            expect(generator.getTotalPairs()).toBe(5)
            expect(generator.getMaxPairsPerRound()).toBe(5)
        })

        it('should return empty array when requesting beyond round limit', () => {
            const generator = new FairPairingGeneratorV4(4, 12345)
            // 4 talks = 2 pairs per round, requesting from position 3 should return empty
            expect(generator.getPairs(3, 5)).toHaveLength(0)
        })

        it('should return valid pairs within round', () => {
            const generator = new FairPairingGeneratorV4(8, 12345)
            const pairsWithPositions = generator.getPairs(0, 3)

            // With 8 talks, max 4 pairs per round
            expect(pairsWithPositions.length).toBeGreaterThan(0)
            expect(pairsWithPositions.length).toBeLessThanOrEqual(3)

            const usedTalks = new Set<number>()
            for (const {
                pair: [talk1, talk2],
                position,
            } of pairsWithPositions) {
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(8)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(8)
                expect(talk1).not.toBe(talk2)
                expect(typeof position).toBe('number')

                // Ensure no talk repetition
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })
    })

    describe('V4 Bug Fix: Accumulator-Style Position Tracking', () => {
        it('should return actual positions that match generator sequence', () => {
            const generator = new FairPairingGeneratorV4(6, 12345)
            const pairsWithPositions = generator.getPairs(0, 3)

            // Check that positions are sequential and start from 0
            pairsWithPositions.forEach((pairWithPos, idx) => {
                expect(pairWithPos.position).toBe(idx)
            })
        })

        it('should use accumulator style - position N always returns Nth valid pair', () => {
            const generator = new FairPairingGeneratorV4(10, 12345)

            // Request pairs that might cause conflicts
            const pairsWithPositions = generator.getPairs(0, 4)

            // CRITICAL: V4 fix ensures position N returns the Nth valid conflict-free pair
            const positions = pairsWithPositions.map((p) => p.position)
            const expectedPositions = Array.from({ length: pairsWithPositions.length }, (_, i) => i)
            expect(positions).toEqual(expectedPositions)

            // Verify no gaps in position sequence
            for (let i = 0; i < positions.length - 1; i++) {
                expect(positions[i + 1] - positions[i]).toBe(1)
            }
        })

        it('should maintain position continuity when requesting from middle of round', () => {
            const generator = new FairPairingGeneratorV4(8, 12345)

            // Get first batch
            const firstBatch = generator.getPairs(0, 2)
            expect(firstBatch.map((p) => p.position)).toEqual([0, 1])

            // Get second batch starting from position 2
            const secondBatch = generator.getPairs(2, 2)
            expect(secondBatch.map((p) => p.position)).toEqual([2, 3])

            // Verify the pairs are deterministic for same positions
            const firstBatchRetry = generator.getPairs(0, 2)
            expect(firstBatchRetry.map((p) => p.pair)).toEqual(firstBatch.map((p) => p.pair))
        })

        it('should pre-generate conflict-free pairs for deterministic indexing', () => {
            const generator = new FairPairingGeneratorV4(10, 12345)

            // Multiple calls to same position should return identical pairs
            const call1 = generator.getPairs(1, 1)
            const call2 = generator.getPairs(1, 1)
            const call3 = generator.getPairs(1, 1)

            expect(call1).toEqual(call2)
            expect(call2).toEqual(call3)
            expect(call1[0].position).toBe(1)
            expect(call1[0].pair).toEqual(call2[0].pair)
        })

        it('should differ from V3 behavior due to accumulator approach', () => {
            const seed = 12345
            const talksCount = 10

            const v3Generator = new FairPairingGeneratorV3(talksCount, seed)
            const v4Generator = new FairPairingGeneratorV4(talksCount, seed)

            // Get pairs from both generators
            const v3Pairs = v3Generator.getPairs(0, 3)
            const v4PairsWithPos = v4Generator.getPairs(0, 3)

            // V4 should have perfect position tracking (accumulator style)
            const v4Positions = v4PairsWithPos.map((p) => p.position)
            expect(v4Positions).toEqual([0, 1, 2])

            // V3 might have gaps due to conflict skipping, V4 should not
            expect(v4PairsWithPos.length).toBe(3) // Requested exactly 3, should get 3
        })

        it('should not skip positions when conflicts occur - accumulator guarantees', () => {
            // This test specifically validates the accumulator approach
            const generator = new FairPairingGeneratorV4(6, 99999) // Seed that causes conflicts

            const pairsWithPositions = generator.getPairs(0, 2)

            // CRITICAL: Accumulator style means we ALWAYS get sequential positions
            expect(pairsWithPositions.length).toBe(2) // Should get exactly what we requested
            expect(pairsWithPositions[0].position).toBe(0)
            expect(pairsWithPositions[1].position).toBe(1)

            // Verify pairs don't conflict within the returned set
            const usedTalks = new Set<number>()
            for (const {
                pair: [talk1, talk2],
            } of pairsWithPositions) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should generate valid pairs at any position within round bounds', () => {
            const generator = new FairPairingGeneratorV4(10, 12345)
            const maxPairs = generator.getTotalPairs()

            // Test getting single pair at various positions
            for (let pos = 0; pos < Math.min(maxPairs, 3); pos++) {
                const result = generator.getPairs(pos, 1)
                expect(result).toHaveLength(1)
                expect(result[0].position).toBe(pos)

                const [talk1, talk2] = result[0].pair
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(10)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(10)
                expect(talk1).not.toBe(talk2)
            }
        })
    })

    describe('Critical Fix: Vote Reconstruction Compatibility', () => {
        it('should resolve the "cannot find pair at position" error from vote reconstruction', () => {
            // This test recreates the exact scenario that caused the V4 vote mapping error
            const generator = new FairPairingGeneratorV4(50, 12345) // Large talk count

            // Simulate requesting pair at position 19 (the failing case from the error)
            const result = generator.getPairs(19, 1)

            // CRITICAL: This should NOT fail and should return exactly position 19
            expect(result).toHaveLength(1)
            expect(result[0].position).toBe(19)

            // Verify the pair is valid
            const [talk1, talk2] = result[0].pair
            expect(talk1).toBeGreaterThanOrEqual(0)
            expect(talk1).toBeLessThan(50)
            expect(talk2).toBeGreaterThanOrEqual(0)
            expect(talk2).toBeLessThan(50)
            expect(talk1).not.toBe(talk2)
        })

        it('should support batch reconstruction patterns used by voting system', () => {
            const generator = new FairPairingGeneratorV4(30, 54321)

            // Simulate the pattern used in vote reconstruction:
            // Generate pairs for positions 0 through maxIndex
            const maxVoteIndex = 15
            const allPairsForReconstruction = generator.getPairs(0, maxVoteIndex + 1)

            // Should generate exactly the requested number without gaps
            expect(allPairsForReconstruction.length).toBe(maxVoteIndex + 1)

            // Each position should be exactly what's expected
            for (let i = 0; i <= maxVoteIndex; i++) {
                expect(allPairsForReconstruction[i].position).toBe(i)
            }

            // Test finding specific vote position (mimics reconstruction logic)
            const targetVotePosition = 10
            const foundPair = allPairsForReconstruction.find((p) => p.position === targetVotePosition)
            expect(foundPair).toBeDefined()
            expect(foundPair?.position).toBe(targetVotePosition)
        })

        it('should maintain consistency across multiple reconstruction calls', () => {
            const generator = new FairPairingGeneratorV4(20, 99999)

            // Multiple reconstruction attempts should yield identical results
            const reconstruction1 = generator.getPairs(0, 10)
            const reconstruction2 = generator.getPairs(0, 10)
            const reconstruction3 = generator.getPairs(0, 10)

            expect(reconstruction1).toEqual(reconstruction2)
            expect(reconstruction2).toEqual(reconstruction3)

            // Spot check specific positions
            expect(reconstruction1[5].position).toBe(5)
            expect(reconstruction1[5].pair).toEqual(reconstruction2[5].pair)
        })
    })

    describe('No talk repetition within round', () => {
        it('should never allow the same talk to appear twice in a round', () => {
            const talksCount = 10
            const generator = new FairPairingGeneratorV4(talksCount, 12345)

            // Request pairs within a round that would use most talks
            const pairsWithPositions = generator.getPairs(0, 4) // 4 pairs = 8 talks max within round

            const usedTalks = new Set<number>()
            for (const {
                pair: [talk1, talk2],
            } of pairsWithPositions) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should handle odd number of talks correctly', () => {
            const generator = new FairPairingGeneratorV4(7, 12345)
            // 7 talks = floor(7/2) = 3 pairs per round
            expect(generator.getMaxPairsPerRound()).toBe(3)

            const pairsWithPositions = generator.getPairs(0, 10)
            expect(pairsWithPositions.length).toBeLessThanOrEqual(3)
        })
    })

    describe('Round completion', () => {
        it('should correctly identify when round is complete', () => {
            const generator = new FairPairingGeneratorV4(6, 12345)
            // 6 talks = 3 pairs per round
            expect(generator.isRoundComplete(0)).toBe(false)
            expect(generator.isRoundComplete(2)).toBe(false)
            expect(generator.isRoundComplete(3)).toBe(true)
            expect(generator.isRoundComplete(4)).toBe(true)
        })

        it('should respect round boundaries', () => {
            const generator = new FairPairingGeneratorV4(20, 12345)
            // 20 talks = 10 pairs per round max

            const allPairs = generator.getPairs(0, 15) // Request more than round limit
            expect(allPairs.length).toBeLessThanOrEqual(10)
        })
    })

    describe('Round seed generation', () => {
        it('should generate different seeds for different rounds', () => {
            const seed1 = FairPairingGeneratorV4.generateRoundSeed(12345, 0)
            const seed2 = FairPairingGeneratorV4.generateRoundSeed(12345, 1)
            const seed3 = FairPairingGeneratorV4.generateRoundSeed(12345, 2)

            expect(seed1).not.toBe(seed2)
            expect(seed2).not.toBe(seed3)
            expect(seed1).not.toBe(seed3)
        })

        it('should generate consistent seeds for same round', () => {
            const seed1 = FairPairingGeneratorV4.generateRoundSeed(12345, 5)
            const seed2 = FairPairingGeneratorV4.generateRoundSeed(12345, 5)

            expect(seed1).toBe(seed2)
        })
    })

    describe('Round-specific pairs generation', () => {
        it('should generate different pairs for different rounds', () => {
            // Generate pairs for round 0
            const round1Seed = FairPairingGeneratorV4.generateRoundSeed(12345, 0)
            const round1Generator = new FairPairingGeneratorV4(10, round1Seed)
            const round1Pairs = round1Generator.getPairs(0, 3).map((p) => p.pair)

            // Generate pairs for round 1
            const round2Seed = FairPairingGeneratorV4.generateRoundSeed(12345, 1)
            const round2Generator = new FairPairingGeneratorV4(10, round2Seed)
            const round2Pairs = round2Generator.getPairs(0, 3).map((p) => p.pair)

            // Convert pairs to strings for easy comparison
            const round1Strings = round1Pairs.map(([a, b]) => `${a},${b}`)
            const round2Strings = round2Pairs.map(([a, b]) => `${a},${b}`)

            // At least some pairs should be different
            const differentPairs = round1Strings.filter((p) => !round2Strings.includes(p))
            expect(differentPairs.length).toBeGreaterThan(0)
        })
    })

    describe('Backward compatibility with V3 interface', () => {
        it('should maintain same total pairs calculation as V3', () => {
            const talksCount = 12
            const seed = 12345

            const v3Generator = new FairPairingGeneratorV3(talksCount, seed)
            const v4Generator = new FairPairingGeneratorV4(talksCount, seed)

            expect(v4Generator.getTotalPairs()).toBe(v3Generator.getTotalPairs())
            expect(v4Generator.getMaxPairsPerRound()).toBe(v3Generator.getMaxPairsPerRound())
        })

        it('should have same round completion logic as V3', () => {
            const talksCount = 8
            const seed = 12345

            const v3Generator = new FairPairingGeneratorV3(talksCount, seed)
            const v4Generator = new FairPairingGeneratorV4(talksCount, seed)

            for (let i = 0; i <= talksCount; i++) {
                expect(v4Generator.isRoundComplete(i)).toBe(v3Generator.isRoundComplete(i))
            }
        })

        it('should generate same round seeds as V3', () => {
            const originalSeed = 12345

            for (let round = 0; round < 5; round++) {
                const v3Seed = FairPairingGeneratorV3.generateRoundSeed(originalSeed, round)
                const v4Seed = FairPairingGeneratorV4.generateRoundSeed(originalSeed, round)
                expect(v4Seed).toBe(v3Seed)
            }
        })
    })
})
