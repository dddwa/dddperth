export class FairPairingGenerator {
    private totalTalks: number
    private totalPairs: number
    private seed: number

    constructor(totalTalks: number, seed: number) {
        this.totalTalks = totalTalks
        this.totalPairs = (totalTalks * (totalTalks - 1)) / 2
        this.seed = seed
    }

    private shuffleIndex(index: number): number {
        // Use a better mixing function
        let hash = index

        // Mix with seed
        hash ^= this.seed
        hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b)
        hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35)
        hash ^= hash >>> 16

        // Ensure positive and in range
        return Math.abs(hash) % this.totalPairs
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

    getPairAtPosition(position: number): [number, number] | null {
        if (position >= this.totalPairs) return null

        // Simple approach - just shuffle the index once
        const shuffled = this.shuffleIndex(position)

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
