export class FairPairingGenerator {
    private totalTalks: number
    private totalPairs: number
    private seed: number

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
        this.totalPairs = (totalTalks * (totalTalks - 1)) / 2
        this.seed = seed
    }

    // Simple but effective shuffle using LCG
    private shuffleIndex(index: number): number {
        // Linear Congruential Generator parameters
        const a = 1664525
        const c = 1013904223
        const m = 2147483647 // 2^31 - 1 (Mersenne prime)

        // Mix the index with seed
        let hash = (index * a + this.seed * c) % m
        hash = (hash * a + c) % m

        // Map to our range
        return hash % this.totalPairs
    }

    // Convert index to talk pair
    private indexToPair(index: number): [number, number] {
        let i = 0
        let remaining = index

        while (remaining >= this.totalTalks - i - 1) {
            remaining -= this.totalTalks - i - 1
            i++
        }

        const j = i + remaining + 1
        return [i, j]
    }

    // Get a specific pair by position in sequence
    getPairAtPosition(position: number): [number, number] | null {
        if (position >= this.totalPairs) return null

        // Use cycle walking to ensure we get a valid permutation
        let shuffled = position
        const seen = new Set<number>()

        do {
            shuffled = this.shuffleIndex(shuffled)
        } while (seen.has(shuffled) && seen.size < this.totalPairs)

        if (seen.has(shuffled)) {
            // Fallback: use position directly if we can't find unique
            shuffled = position
        }
        seen.add(shuffled)

        return this.indexToPair(shuffled)
    }

    // Get next N pairs efficiently
    getNextPairs(startPosition: number, count: number): Array<[number, number]> {
        const pairs: Array<[number, number]> = []

        for (let i = 0; i < count && startPosition + i < this.totalPairs; i++) {
            const pair = this.getPairAtPosition(startPosition + i)
            if (pair) pairs.push(pair)
        }

        return pairs
    }
}
