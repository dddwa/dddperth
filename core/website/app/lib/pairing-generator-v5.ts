/**
 * FairPairingGeneratorV5 - balanced no-repeat pairing generator.
 *
 * V5 assigns each voting round one round-robin matching. A matching contains
 * each talk at most once, so a voter cannot see a repeated talk in a round.
 * As session seeds and round numbers advance, matchings cycle so completed
 * rounds cover all possible pairs evenly and short rounds distribute early
 * exposure across talks.
 */
export class FairPairingGeneratorV5 {
    private readonly totalTalks: number
    private readonly maxPairsPerSession: number
    private readonly scheduleRounds: number
    private readonly sessionIndex: number
    private readonly roundNumber: number
    private cachedPairs: Array<[number, number]> | null = null

    constructor(totalTalks: number, seed: number, roundNumber = 0) {
        this.totalTalks = totalTalks
        this.maxPairsPerSession = Math.floor(totalTalks / 2)
        this.scheduleRounds = totalTalks < 2 ? 0 : totalTalks % 2 === 0 ? totalTalks - 1 : totalTalks
        this.sessionIndex = Math.max(0, Math.floor(seed) - 1)
        this.roundNumber = Math.max(0, Math.floor(roundNumber))
    }

    private generateSessionPairs(): Array<[number, number]> {
        if (this.cachedPairs !== null) {
            return this.cachedPairs
        }

        if (this.maxPairsPerSession === 0 || this.scheduleRounds === 0) {
            this.cachedPairs = []
            return this.cachedPairs
        }

        const participantCount = this.totalTalks % 2 === 0 ? this.totalTalks : this.totalTalks + 1
        const dummyTalk = this.totalTalks
        const matchingIndex = (this.sessionIndex + this.roundNumber) % this.scheduleRounds
        const participants = Array.from({ length: participantCount }, (_, index) => index)
        const fixedParticipant = participants[0]
        const rotatingParticipants = participants.slice(1)
        const rotatedParticipants = rotateLeft(rotatingParticipants, matchingIndex)
        const roundParticipants = [fixedParticipant, ...rotatedParticipants]
        const pairs: Array<[number, number]> = []

        for (let index = 0; index < participantCount / 2; index++) {
            const left = roundParticipants[index]
            const right = roundParticipants[participantCount - 1 - index]

            if (left !== dummyTalk && right !== dummyTalk) {
                pairs.push(this.orderPair(left, right, pairs.length))
            }
        }

        this.cachedPairs = shuffleWithSeed(pairs, mix32(this.sessionIndex + this.roundNumber * 0x9e3779b9 + 0x6d2b79f5))
        return this.cachedPairs
    }

    private orderPair(left: number, right: number, position: number): [number, number] {
        const hash = mix32(this.sessionIndex + position * 0x9e3779b9)
        return hash % 2 === 0 ? [left, right] : [right, left]
    }

    getPairs(startPosition: number, requestedCount: number): Array<{ pair: [number, number]; position: number }> {
        if (startPosition < 0 || requestedCount <= 0) {
            return []
        }

        const pairs = this.generateSessionPairs()
        return pairs.slice(startPosition, startPosition + requestedCount).map((pair, index) => ({
            pair,
            position: startPosition + index,
        }))
    }

    getTotalPairs(): number {
        return this.maxPairsPerSession
    }

    isRoundComplete(indexInRound: number): boolean {
        return indexInRound >= this.getTotalPairs()
    }

    getMaxPairsPerRound(): number {
        return this.maxPairsPerSession
    }

    getScheduleRounds(): number {
        return this.scheduleRounds
    }
}

function rotateLeft<T>(values: T[], amount: number): T[] {
    if (values.length === 0) {
        return values
    }

    const offset = positiveModulo(amount, values.length)
    return values.slice(offset).concat(values.slice(0, offset))
}

function positiveModulo(value: number, modulo: number): number {
    return ((value % modulo) + modulo) % modulo
}

function shuffleWithSeed<T>(values: T[], seed: number): T[] {
    const shuffled = [...values]
    let state = seed

    for (let index = shuffled.length - 1; index > 0; index--) {
        state = mix32(state + index)
        const swapIndex = state % (index + 1)
        ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
    }

    return shuffled
}

function mix32(value: number): number {
    let hash = value >>> 0
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x7feb352d)
    hash ^= hash >>> 15
    hash = Math.imul(hash, 0x846ca68b)
    hash ^= hash >>> 16
    return hash >>> 0
}
