import { describe, expect, it } from 'vitest'
import { FairPairingGenerator } from './pairing-generator'

describe('FairPairingGenerator', () => {
    describe('Basic functionality', () => {
        it('should create generator with correct total pairs calculation', () => {
            const generator = new FairPairingGenerator(5, 12345)
            // 5 talks should have 5*4/2 = 10 possible pairs
            expect(generator.getTotalPairs()).toBe(10)
        })

        it('should return empty array when requesting beyond total pairs', () => {
            const generator = new FairPairingGenerator(3, 12345)
            // 3 talks = 3 pairs, requesting from position 10 should return empty
            expect(generator.getNextPairs(10, 5)).toHaveLength(0)
        })

        it('should return valid pairs within range', () => {
            const generator = new FairPairingGenerator(5, 12345)
            const pairs = generator.getNextPairs(0, 3)
            
            // With 5 talks, max 2 pairs without repetition (uses 4 talks)
            expect(pairs.length).toBeGreaterThan(0)
            expect(pairs.length).toBeLessThanOrEqual(Math.floor(5 / 2))
            
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(5)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(5)
                expect(talk1).not.toBe(talk2)
                
                // Ensure no talk repetition
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })
    })

    describe('No talk repetition', () => {
        it('should never allow the same talk to appear twice in a batch', () => {
            const talksCount = 10
            const generator = new FairPairingGenerator(talksCount, 12345)
            
            // Request a batch that would use most talks
            const pairs = generator.getNextPairs(0, 4) // 4 pairs = 8 talks max
            
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })
        
        it('should never produce duplicate pairs across entire session', () => {
            const talksCount = 10
            const generator = new FairPairingGenerator(talksCount, 12345)
            const maxPairs = generator.getTotalPairs()
            
            // Get all pairs by iterating through the entire session
            const seenPairs = new Set<string>()
            let position = 0
            
            while (position < maxPairs) {
                const batch = generator.getNextPairs(position, 10)
                if (batch.length === 0) break
                
                for (const [talk1, talk2] of batch) {
                    const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
                    expect(seenPairs.has(pairKey)).toBe(false)
                    seenPairs.add(pairKey)
                }
                
                position = generator.getCurrentPosition()
            }
        })

        it('should limit batch size based on available unique talks', () => {
            const talksCount = 3
            const generator = new FairPairingGenerator(talksCount, 12345)
            
            // With 3 talks, maximum batch size is 1 pair (2 talks used)
            // Requesting more should still only return what's possible without repetition
            const pairs = generator.getNextPairs(0, 10)
            expect(pairs.length).toBeLessThanOrEqual(Math.floor(talksCount / 2))
            
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should handle edge case with 2 talks', () => {
            const generator = new FairPairingGenerator(2, 12345)
            const pairs = generator.getNextPairs(0, 10) // Request more than 1 pair
            
            expect(pairs).toHaveLength(1) // Only 1 pair possible without repetition
            const [talk1, talk2] = pairs[0]
            expect(talk1).not.toBe(talk2)
            expect([talk1, talk2].sort()).toEqual([0, 1])
        })

        it('should handle edge case with 1 talk', () => {
            const generator = new FairPairingGenerator(1, 12345)
            const pairs = generator.getNextPairs(0, 10)
            
            expect(pairs).toHaveLength(0) // No pairs possible
        })

        it('should eventually show all possible pairs across entire session', () => {
            const talksCount = 4
            const seed = 12345
            
            // Create a fresh generator to get all pairs systematically
            const generator = new FairPairingGenerator(talksCount, seed)
            const maxPairs = generator.getTotalPairs() // 6 pairs
            
            // Collect all unique pairs by repeatedly creating new generators
            // and advancing through different starting positions
            const allSeenPairs = new Set<string>()
            
            for (let startPos = 0; startPos < maxPairs; startPos++) {
                const freshGenerator = new FairPairingGenerator(talksCount, seed)
                const batch = freshGenerator.getNextPairs(startPos, 10) // Get what we can from this position
                
                for (const [talk1, talk2] of batch) {
                    const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
                    allSeenPairs.add(pairKey)
                }
                
                // Stop if we've seen all possible pairs
                if (allSeenPairs.size === maxPairs) break
            }
            
            // Check that all possible pairs are eventually shown
            const expectedPairs = new Set([
                '0-1', '0-2', '0-3',
                '1-2', '1-3',
                '2-3'
            ])
            
            expect(allSeenPairs).toEqual(expectedPairs)
        })
    })

    describe('Reproducibility and seeding', () => {
        it('should produce same results with same seed', () => {
            const seed = 12345
            const generator1 = new FairPairingGenerator(10, seed)
            const generator2 = new FairPairingGenerator(10, seed)
            
            const pairs1 = generator1.getNextPairs(0, 20)
            const pairs2 = generator2.getNextPairs(0, 20)
            
            expect(pairs1).toEqual(pairs2)
        })

        it('should produce different results with different seeds', () => {
            const generator1 = new FairPairingGenerator(10, 12345)
            const generator2 = new FairPairingGenerator(10, 54321)
            
            const pairs1 = generator1.getNextPairs(0, 20)
            const pairs2 = generator2.getNextPairs(0, 20)
            
            expect(pairs1).not.toEqual(pairs2)
        })

        it('should be deterministic across multiple calls with same parameters', () => {
            const generator = new FairPairingGenerator(8, 98765)
            
            const firstCall = generator.getNextPairs(0, 10)
            const secondCall = generator.getNextPairs(0, 10)
            
            expect(firstCall).toEqual(secondCall)
        })
    })

    describe('Session slicing', () => {
        it('should support getting pairs from different start positions', () => {
            const generator = new FairPairingGenerator(6, 12345)
            const maxPairs = generator.getTotalPairs() // 6 talks = 15 total pairs
            
            const firstBatch = generator.getNextPairs(0, 5)
            const secondBatch = generator.getNextPairs(5, 5)
            const thirdBatch = generator.getNextPairs(10, 5)
            
            // Batches may be smaller due to no-talk-repetition constraint
            expect(firstBatch.length).toBeGreaterThan(0)
            expect(secondBatch.length).toBeGreaterThan(0)
            expect(thirdBatch.length).toBeGreaterThan(0)
            
            // Verify no duplicate pairs across the entire session
            const allPairs = [...firstBatch, ...secondBatch, ...thirdBatch]
            const pairStrings = new Set<string>()
            
            for (const [talk1, talk2] of allPairs) {
                const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
                expect(pairStrings.has(pairKey)).toBe(false)
                pairStrings.add(pairKey)
            }
            
            // Total pairs should not exceed maximum possible
            expect(allPairs.length).toBeLessThanOrEqual(maxPairs)
        })

        it('should handle partial batches at the end', () => {
            const generator = new FairPairingGenerator(4, 12345)
            const maxPairs = generator.getTotalPairs() // 6 pairs
            
            const batch1 = generator.getNextPairs(0, 4)
            const batch2 = generator.getNextPairs(4, 4)
            
            expect(batch1.length).toBeGreaterThan(0)
            expect(batch2.length).toBeGreaterThan(0)
            expect(batch1.length + batch2.length).toBeLessThanOrEqual(maxPairs)
            
            // Verify no duplicate pairs between batches
            const allPairs = [...batch1, ...batch2]
            const pairStrings = new Set<string>()
            
            for (const [talk1, talk2] of allPairs) {
                const pairKey = `${Math.min(talk1, talk2)}-${Math.max(talk1, talk2)}`
                expect(pairStrings.has(pairKey)).toBe(false)
                pairStrings.add(pairKey)
            }
        })
    })

    describe('Performance and large datasets', () => {
        it('should handle reasonably large talk counts efficiently', () => {
            const start = Date.now()
            const generator = new FairPairingGenerator(100, 12345)
            const pairs = generator.getNextPairs(0, 50) // Request reasonable batch size
            const end = Date.now()
            
            expect(pairs.length).toBeGreaterThan(0)
            expect(pairs.length).toBeLessThanOrEqual(50) // Max 50 pairs in batch
            expect(end - start).toBeLessThan(100) // Should complete in under 100ms
            
            // Verify no duplicate talks in batch
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should handle edge case with very large talk count', () => {
            const generator = new FairPairingGenerator(250, 12345)
            const pairs = generator.getNextPairs(0, 50)
            
            expect(pairs.length).toBeGreaterThan(0)
            expect(pairs.length).toBeLessThanOrEqual(50)
            
            // Verify no duplicate talks within batch
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of pairs) {
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
                
                // Verify talk indices are within bounds
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(250)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(250)
                expect(talk1).not.toBe(talk2)
            }
        })
    })

    describe('Integration with typical voting scenarios', () => {
        it('should support typical voting session size', () => {
            // Simulate typical voting scenario: 250 talks, 50 pairs per session
            const generator = new FairPairingGenerator(250, Date.now())
            const sessionPairs = generator.getNextPairs(0, 50)
            
            expect(sessionPairs.length).toBeGreaterThan(0)
            expect(sessionPairs.length).toBeLessThanOrEqual(50)
            
            // Verify no talk appears twice in this batch
            const usedTalks = new Set<number>()
            for (const [talk1, talk2] of sessionPairs) {
                expect(talk1).toBeGreaterThanOrEqual(0)
                expect(talk1).toBeLessThan(250)
                expect(talk2).toBeGreaterThanOrEqual(0)
                expect(talk2).toBeLessThan(250)
                expect(talk1).not.toBe(talk2)
                
                expect(usedTalks.has(talk1)).toBe(false)
                expect(usedTalks.has(talk2)).toBe(false)
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }
        })

        it('should support multiple consecutive sessions without talk repetition within each batch', () => {
            const generator = new FairPairingGenerator(20, 12345)
            const sessionSize = 10
            
            // Get 3 consecutive batches
            const session1 = generator.getNextPairs(0, sessionSize)
            const session2 = generator.getNextPairs(sessionSize, sessionSize)
            const session3 = generator.getNextPairs(sessionSize * 2, sessionSize)
            
            // Check each batch has no talk repetition within it
            const sessions = [session1, session2, session3]
            sessions.forEach((session, index) => {
                const usedTalks = new Set<number>()
                session.forEach(([talk1, talk2]) => {
                    expect(usedTalks.has(talk1)).toBe(false)
                    expect(usedTalks.has(talk2)).toBe(false)
                    usedTalks.add(talk1)
                    usedTalks.add(talk2)
                })
            })
        })
    })
})