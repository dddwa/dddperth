/**
 * FairPairingGeneratorV4 - Fixed round-based pairing generator
 * 
 * This generator creates manageable rounds of pairs instead of exhaustive combinations.
 * Each round contains at most floor(totalTalks/2) pairs, ensuring no talk appears twice
 * in the same round.
 * 
 * Key differences from V3:
 * - FIXED: Correct index assignment that matches actual position in generator sequence
 * - Returns pairs with their actual positions to prevent indexing bugs
 * - Maintains same algorithmic fairness as V3 but with correct reconstruction
 * 
 * V3 Bug Fix:
 * V3 had a critical bug where vote indices didn't match actual pair positions due to
 * conflict avoidance logic. V4 fixes this by always returning actual positions.
 */
export class FairPairingGeneratorV4 {
    private totalTalks: number
    private seed: number
    private maxPairsPerRound: number
    private random: () => number
    private shuffledPairIndices: number[] | null = null
    private cachedConflictFreePairs: Array<[number, number]> | null = null

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
        this.seed = seed
        this.maxPairsPerRound = Math.floor(totalTalks / 2)
        this.random = this.seededRandom(seed)
    }

    // Seeded random number generator (Linear Congruential Generator)
    private seededRandom(seed: number): () => number {
        let state = seed
        return () => {
            state = (state * 1664525 + 1013904223) % 4294967296
            return state / 4294967296
        }
    }

    // Convert pair index to actual pair coordinates
    private indexToPair(index: number): [number, number] {
        // Convert linear index to (i, j) pair coordinates
        // For pairs (0,1), (0,2), ..., (0,n-1), (1,2), (1,3), ..., (n-2,n-1)
        let i = 0
        let remaining = index
        
        while (remaining >= this.totalTalks - i - 1) {
            remaining -= this.totalTalks - i - 1
            i++
        }
        
        const j = i + remaining + 1
        return [i, j]
    }

    // Lazy generation of shuffled indices (only when needed)
    private getShuffledIndices(): number[] {
        if (this.shuffledPairIndices === null) {
            // For round-based system, generate only maxPairsPerRound unique indices
            const totalPossiblePairs = (this.totalTalks * (this.totalTalks - 1)) / 2
            const selectedIndices = new Set<number>()

            while (selectedIndices.size < this.maxPairsPerRound) {
                const randomIndex = Math.floor(this.random() * totalPossiblePairs)
                selectedIndices.add(randomIndex)
            }

            this.shuffledPairIndices = Array.from(selectedIndices)
        }

        return this.shuffledPairIndices
    }

    // Internal method to generate conflict-free pairs in order
    private generateConflictFreePairs(): Array<[number, number]> {
        // Cache the result to avoid recomputing on each getPairs call
        if (this.cachedConflictFreePairs === null) {
            const validPairs: Array<[number, number]> = []
            const usedTalks = new Set<number>()
            const shuffledIndices = this.getShuffledIndices()

            for (const pairIndex of shuffledIndices) {
                const [talk1, talk2] = this.indexToPair(pairIndex)
                
                // Only add this pair if neither talk has been used yet
                if (!usedTalks.has(talk1) && !usedTalks.has(talk2)) {
                    validPairs.push([talk1, talk2])
                    usedTalks.add(talk1)
                    usedTalks.add(talk2)
                    
                    // Stop when we have enough valid pairs for the round
                    if (validPairs.length >= this.maxPairsPerRound) {
                        break
                    }
                }
            }

            this.cachedConflictFreePairs = validPairs
        }

        return this.cachedConflictFreePairs
    }

    // Get batch of pairs starting from a logical position
    // Position N always returns the Nth valid conflict-free pair
    getPairs(startPosition: number, requestedCount: number): Array<{pair: [number, number], position: number}> {
        const allValidPairs = this.generateConflictFreePairs() // Now cached, only computed once
        const pairs: Array<{pair: [number, number], position: number}> = []

        for (let i = 0; i < requestedCount; i++) {
            const position = startPosition + i
            if (position < allValidPairs.length) {
                pairs.push({
                    pair: allValidPairs[position],
                    position: position
                })
            }
        }

        return pairs
    }

    // Get total number of valid pairs available for this round
    getTotalPairs(): number {
        return this.generateConflictFreePairs().length
    }

    // Check if a specific index represents a complete round
    isRoundComplete(indexInRound: number): boolean {
        return indexInRound >= this.getTotalPairs()
    }

    // Get maximum pairs per round
    getMaxPairsPerRound(): number {
        return this.maxPairsPerRound
    }

    // Generate deterministic round seed
    static generateRoundSeed(originalSeed: number, roundNumber: number): number {
        // Simple hash function - deterministic but unpredictable
        return ((originalSeed + roundNumber) * 1664525 + 1013904223) % 4294967296
    }
}