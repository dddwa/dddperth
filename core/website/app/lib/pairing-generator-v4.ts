/**
 * FairPairingGeneratorV4 - Deterministic round-based pairing generator
 * 
 * This generator creates manageable rounds of pairs instead of exhaustive combinations.
 * Each round contains at most floor(totalTalks/2) pairs, ensuring no talk appears twice
 * in the same round.
 * 
 * Key properties:
 * - Correct index assignment that matches actual position in generator sequence
 * - Returns pairs with their actual positions to prevent indexing bugs
 * - Deterministic round generation from a session seed plus round number
 */
export class FairPairingGeneratorV4 {
    private totalTalks: number
    private maxPairsPerRound: number
    private random: () => number
    private shuffledPairIndices: number[] | null = null
    private cachedConflictFreePairs: Array<[number, number]> | null = null

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
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
            const totalPossiblePairs = (this.totalTalks * (this.totalTalks - 1)) / 2
            const indices = Array.from({ length: totalPossiblePairs }, (_, index) => index)

            // Deterministically shuffle the full pair space so we can always
            // fill the round while keeping position-to-pair mapping stable.
            for (let i = indices.length - 1; i > 0; i--) {
                const swapIndex = Math.floor(this.random() * (i + 1))
                ;[indices[i], indices[swapIndex]] = [indices[swapIndex], indices[i]]
            }

            this.shuffledPairIndices = indices
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
        if (startPosition < 0 || requestedCount <= 0) {
            return []
        }

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

    // V4 keeps V3's round size contract while fixing position tracking.
    getTotalPairs(): number {
        return this.maxPairsPerRound
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
