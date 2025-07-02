/**
 * FairPairingGeneratorV3 - Round-based pairing generator
 * 
 * This generator creates manageable rounds of pairs instead of exhaustive combinations.
 * Each round contains at most floor(totalTalks/2) pairs, ensuring no talk appears twice
 * in the same round.
 * 
 * Key differences from V2:
 * - Limited to maxPairsPerRound instead of all possible pairs
 * - Designed for multiple rounds with different seeds
 * - Better suited for user-friendly voting sessions
 */
export class FairPairingGeneratorV3 {
    private totalTalks: number
    private seed: number
    private maxPairsPerRound: number
    private random: () => number
    private shuffledPairIndices: number[] | null = null

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
            // For round-based system, generate only maxPairsPerRound indices
            // This represents random pairs from all possible combinations
            const totalPossiblePairs = (this.totalTalks * (this.totalTalks - 1)) / 2
            const indices = Array.from({ length: totalPossiblePairs }, (_, i) => i)

            // Fisher-Yates shuffle to randomize pair selection
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1))
                ;[indices[i], indices[j]] = [indices[j], indices[i]]
            }

            // Take only the first maxPairsPerRound for this round
            this.shuffledPairIndices = indices.slice(0, this.maxPairsPerRound)
        }

        return this.shuffledPairIndices
    }

    // Get batch of pairs ensuring no talk appears twice in the batch
    getPairs(startPosition: number, requestedCount: number): Array<[number, number]> {
        const pairs: Array<[number, number]> = []
        const usedTalks = new Set<number>()
        let position = startPosition

        const shuffledIndices = this.getShuffledIndices()

        while (pairs.length < requestedCount && position < shuffledIndices.length) {
            const pairIndex = shuffledIndices[position]
            const [talk1, talk2] = this.indexToPair(pairIndex)

            // Only add this pair if neither talk has been used in this batch
            if (!usedTalks.has(talk1) && !usedTalks.has(talk2)) {
                pairs.push([talk1, talk2])
                usedTalks.add(talk1)
                usedTalks.add(talk2)
            }

            position++
        }


        return pairs
    }

    // Get total number of pairs for this round (not all possible pairs)
    getTotalPairs(): number {
        return this.maxPairsPerRound
    }

    // Check if a specific index represents a complete round
    isRoundComplete(indexInRound: number): boolean {
        return indexInRound >= this.maxPairsPerRound
    }

    // Get maximum pairs per round
    getMaxPairsPerRound(): number {
        return this.maxPairsPerRound
    }

    // Generate deterministic round seed
    generateRoundSeed(originalSeed: number, roundNumber: number): number {
        // Simple hash function - deterministic but unpredictable
        return ((originalSeed + roundNumber) * 1664525 + 1013904223) % 4294967296
    }

}