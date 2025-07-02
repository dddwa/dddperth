import { describe, expect, it } from 'vitest'
import { FairPairingGeneratorV3 } from './pairing-generator-v3'

describe('FairPairingGeneratorV3', () => {
    describe('Round-based functionality', () => {
        it('should create generator with correct total pairs per round', () => {
            const generator = new FairPairingGeneratorV3(5, 12345)
            // 5 talks should have floor(5/2) = 2 pairs per round (not 10 total pairs)
            expect(generator.getTotalPairs()).toBe(2)
            expect(generator.getMaxPairsPerRound()).toBe(2)
        })

        it('should limit pairs to maxPairsPerRound', () => {
            const generator = new FairPairingGeneratorV3(10, 12345)
            // 10 talks = 5 pairs per round maximum
            expect(generator.getTotalPairs()).toBe(5)
            expect(generator.getMaxPairsPerRound()).toBe(5)
        })

        it('should return empty array when requesting beyond round limit', () => {
            const generator = new FairPairingGeneratorV3(4, 12345)
            // 4 talks = 2 pairs per round, requesting from position 3 should return empty
            expect(generator.getPairs(3, 5)).toHaveLength(0)
        })

        it('should return valid pairs within round', () => {
            const generator = new FairPairingGeneratorV3(8, 12345)
            const pairs = generator.getPairs(0, 3)

            // With 8 talks, max 4 pairs per round
            expect(pairs.length).toBeGreaterThan(0)
            expect(pairs.length).toBeLessThanOrEqual(3)

            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(8)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(8)
                expect(talk1).not.toBe(talk2)

                // Ensure no talk repetition
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })
    })

    describe('No talk repetition within round', () => {
        it('should never allow the same talk to appear twice in a round', () => {
            const talksCount = 10
            const generator = new FairPairingGeneratorV3(talksCount, 12345)

            // Request pairs within a round that would use most talks
            const pairs = generator.getPairs(0, 4) // 4 pairs = 8 talks max within round

            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should handle odd number of talks correctly', () => {
            const generator = new FairPairingGeneratorV3(7, 12345)
            // 7 talks = floor(7/2) = 3 pairs per round
            expect(generator.getMaxPairsPerRound()).toBe(3)
            
            const pairs = generator.getPairs(0, 10)
            expect(pairs.length).toBeLessThanOrEqual(3)
        })
    })

    describe('Round completion', () => {
        it('should correctly identify when round is complete', () => {
            const generator = new FairPairingGeneratorV3(6, 12345)
            // 6 talks = 3 pairs per round
            expect(generator.isRoundComplete(0)).toBe(false)
            expect(generator.isRoundComplete(2)).toBe(false)
            expect(generator.isRoundComplete(3)).toBe(true)
            expect(generator.isRoundComplete(4)).toBe(true)
        })

        it('should respect round boundaries', () => {
            const generator = new FairPairingGeneratorV3(20, 12345)
            // 20 talks = 10 pairs per round max
            
            const allPairs = generator.getPairs(0, 15) // Request more than round limit
            expect(allPairs.length).toBeLessThanOrEqual(10)
        })
    })

    describe('Round seed generation', () => {
        it('should generate different seeds for different rounds', () => {
            const generator = new FairPairingGeneratorV3(10, 12345)
            const seed1 = generator.generateRoundSeed(12345, 0)
            const seed2 = generator.generateRoundSeed(12345, 1)
            const seed3 = generator.generateRoundSeed(12345, 2)
            
            expect(seed1).not.toBe(seed2)
            expect(seed2).not.toBe(seed3)
            expect(seed1).not.toBe(seed3)
        })

        it('should generate consistent seeds for same round', () => {
            const generator1 = new FairPairingGeneratorV3(10, 12345)
            const generator2 = new FairPairingGeneratorV3(10, 12345)
            
            const seed1 = generator1.generateRoundSeed(12345, 5)
            const seed2 = generator2.generateRoundSeed(12345, 5)
            
            expect(seed1).toBe(seed2)
        })
    })

    describe('round-specific pairs generation', () => {
        it('should generate different pairs for different rounds', () => {
            const generator = new FairPairingGeneratorV3(10, 12345)
            
            // Generate pairs for round 0
            const round1Seed = generator.generateRoundSeed(12345, 0)
            const round1Generator = new FairPairingGeneratorV3(10, round1Seed)
            const round1Pairs = round1Generator.getPairs(0, 3)
            
            // Generate pairs for round 1
            const round2Seed = generator.generateRoundSeed(12345, 1)
            const round2Generator = new FairPairingGeneratorV3(10, round2Seed)
            const round2Pairs = round2Generator.getPairs(0, 3)
            
            // Convert pairs to strings for easy comparison
            const round1Strings = round1Pairs.map(([a, b]) => `${a},${b}`)
            const round2Strings = round2Pairs.map(([a, b]) => `${a},${b}`)
            
            // At least some pairs should be different
            const differentPairs = round1Strings.filter(p => !round2Strings.includes(p))
            expect(differentPairs.length).toBeGreaterThan(0)
        })
    })
})