export class FairPairingGenerator {
    private totalTalks: number
    private seed: number
    private allPairs: Array<[number, number]>
    private shuffledPairIndices: number[]
    private currentPosition = 0

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
        this.seed = seed
        this.allPairs = this.generateAllPairs()
        this.shuffledPairIndices = this.generateShuffledIndices()
    }

    // Seeded random number generator (Linear Congruential Generator)
    private seededRandom(seed: number): () => number {
        let state = seed
        return () => {
            state = (state * 1664525 + 1013904223) % 4294967296
            return state / 4294967296
        }
    }

    // Generate all possible pairs
    private generateAllPairs(): Array<[number, number]> {
        const pairs: Array<[number, number]> = []
        for (let i = 0; i < this.totalTalks; i++) {
            for (let j = i + 1; j < this.totalTalks; j++) {
                pairs.push([i, j])
            }
        }
        return pairs
    }

    // Fisher-Yates shuffle of pair indices
    private generateShuffledIndices(): number[] {
        const indices = Array.from({ length: this.allPairs.length }, (_, i) => i)
        const random = this.seededRandom(this.seed)

        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1))
            ;[indices[i], indices[j]] = [indices[j], indices[i]]
        }

        return indices
    }

    // Get next batch of pairs ensuring no talk appears twice in the batch
    getNextPairs(startPosition: number, requestedCount: number): Array<[number, number]> {
        const pairs: Array<[number, number]> = []
        const usedTalks = new Set<number>()
        let position = startPosition

        while (pairs.length < requestedCount && position < this.shuffledPairIndices.length) {
            const pairIndex = this.shuffledPairIndices[position]
            const [talk1, talk2] = this.allPairs[pairIndex]

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
        return this.allPairs.length
    }

    // Check if we've exhausted all pairs
    isComplete(): boolean {
        return this.currentPosition >= this.allPairs.length
    }

    // Get current position in the shuffle
    getCurrentPosition(): number {
        return this.currentPosition
    }
}
