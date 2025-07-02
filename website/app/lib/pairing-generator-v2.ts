export class FairPairingGeneratorV2 {
    private totalTalks: number
    private seed: number
    private totalPairsCount: number
    private random: () => number
    private shuffledPairIndices: number[] | null = null
    private currentPosition = 0

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
        this.seed = seed
        this.totalPairsCount = (totalTalks * (totalTalks - 1)) / 2
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
            const indices = Array.from({ length: this.totalPairsCount }, (_, i) => i)
            
            // Fisher-Yates shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(this.random() * (i + 1))
                ;[indices[i], indices[j]] = [indices[j], indices[i]]
            }
            
            this.shuffledPairIndices = indices
        }
        
        return this.shuffledPairIndices
    }

    // Get next batch of pairs ensuring no talk appears twice in the batch
    getNextPairs(startPosition: number, requestedCount: number): Array<[number, number]> {
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

        // Update position for tracking
        this.currentPosition = position

        return pairs
    }

    // Get total number of possible pairs
    getTotalPairs(): number {
        return this.totalPairsCount
    }

    // Check if we've exhausted all pairs
    isComplete(): boolean {
        return this.currentPosition >= this.totalPairsCount
    }

    // Get current position in the shuffle
    getCurrentPosition(): number {
        return this.currentPosition
    }
}
