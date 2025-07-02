import { FairPairingGeneratorV2 } from './pairing-generator-v2'
import { FairPairingGeneratorV3 } from './pairing-generator-v3'
import { FairPairingGeneratorV1 } from './pairing.generator-v1'
import type { TalkVotingData, VoteRecord, VotingSession } from './voting.server'

// Explicit mapping between session version and algorithm version
export function getAlgorithmVersionFromSession(session: VotingSession): number {
    if (session.version === undefined) {
        return 1 // V1 sessions had no version field
    }
    if (session.version === 2) {
        return 2 // V2 sessions used algorithm v2
    }
    if (session.version === 3) {
        return 3 // V3 sessions used algorithm v3
    }

    // @ts-expect-error exhaustive check
    throw new Error(`Unknown session version: ${session.version}`)
}
/**
 * Reconstructs which talks were voted for based on the vote record and session data.
 * Handles different algorithm versions for backward compatibility.
 */
export function reconstructVoteContext(
    vote: VoteRecord,
    session: VotingSession,
    talks: TalkVotingData[],
): [number, number] {
    // Use discriminators to determine vote and session types
    if (session.version === undefined && vote.voteVersion === undefined) {
        // V1: Used a different shuffling algorithm
        const generator = new FairPairingGeneratorV1(talks.length, session.seed)
        const pair = generator.getPairAtPosition(vote.voteIndex)
        if (!pair) {
            throw new Error(`No pair found at index ${vote.voteIndex} for algorithm v1`)
        }
        return pair
    }

    if (session.version === 2 && vote.voteVersion === undefined) {
        // V2: Exhaustive pair generation with no talk repetition
        const generator = new FairPairingGeneratorV2(talks.length, session.seed)
        const pairs = generator.getNextPairs(vote.voteIndex, 1)
        if (pairs.length === 0) {
            throw new Error(`No pair found at index ${vote.voteIndex} for algorithm v2`)
        }
        return pairs[0]
    }

    if (session.version === 3 && vote.voteVersion === 2) {
        // V3: Round-based generation
        const generator = new FairPairingGeneratorV3(talks.length, session.seed)
        const roundSeed = generator.generateRoundSeed(session.seed, vote.roundNumber)

        // Create a generator for that specific round
        const roundGenerator = new FairPairingGeneratorV3(talks.length, roundSeed)
        const pairs = roundGenerator.getPairs(vote.indexInRound, 1)

        if (pairs.length === 0) {
            throw new Error(`No pair found at round ${vote.roundNumber}, index ${vote.indexInRound} for algorithm v3`)
        }

        return pairs[0]
    }

    throw new Error(
        `Unsupported combination: session algorithm ${session.version}, vote structure ${JSON.stringify(vote)}`,
    )
}

/**
 * Groups votes by algorithm version and round for efficient ELO calculation
 * NOTE: algorithmVersion should come from the session, not individual votes
 */
export function groupVotesByAlgorithmAndRound(votes: VoteRecord[], session: VotingSession): Map<string, VoteRecord[]> {
    const groups = new Map<string, VoteRecord[]>()
    const algorithmVersion = getAlgorithmVersionFromSession(session)

    for (const vote of votes) {
        // Use voteVersion discriminator to determine round number
        const roundNumber = vote.voteVersion === 2 ? vote.roundNumber : 0
        const key = `${algorithmVersion}_${roundNumber}`

        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key)?.push(vote)
    }

    return groups
}

/**
 * Sorts votes within a group chronologically for accurate ELO progression
 */
export function sortVotesChronologically(votes: VoteRecord[]): VoteRecord[] {
    return votes.sort((a, b) => {
        // Use voteVersion discriminator to determine how to sort
        if (a.voteVersion === undefined && b.voteVersion === undefined) {
            // Legacy votes: sort by voteIndex
            return a.voteIndex - b.voteIndex
        }

        if (a.voteVersion === 2 && b.voteVersion === 2) {
            // V2 votes: sort by indexInRound
            return a.indexInRound - b.indexInRound
        }

        // Mixed vote types - shouldn't happen but handle gracefully
        // Fall back to timestamp comparison
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    })
}

/**
 * Data Quality and Manipulation Functions
 *
 * These functions handle legacy data issues from different algorithm versions:
 * - V1: Random bias correction
 * - V2: Duplicate pair filtering
 * - V3: No filtering needed
 */

export interface DataQualityReport {
    totalVotes: number
    filteredVotes: number
    duplicatesRemoved: number
    biasDetected: boolean
    algorithmVersion: number
}

/**
 * Detects duplicate pairs within V2 algorithm sessions
 * V2 exhaustive generation could sometimes create the same pair multiple times
 */
export function detectV2Duplicates(votes: VoteRecord[], session: VotingSession, talks: TalkVotingData[]): Set<string> {
    const duplicateVoteIds = new Set<string>()
    const seenPairs = new Set<string>()

    if (getAlgorithmVersionFromSession(session) !== 2) {
        return duplicateVoteIds // Only check V2 sessions
    }

    for (const vote of votes) {
        if (vote.voteVersion !== undefined) continue // Skip V3 votes

        try {
            const [leftIndex, rightIndex] = reconstructVoteContext(vote, session, talks)
            const pairKey = `${Math.min(leftIndex, rightIndex)}-${Math.max(leftIndex, rightIndex)}`

            if (seenPairs.has(pairKey)) {
                // This is a duplicate pair within the same session
                duplicateVoteIds.add(vote.rowKey)
            } else {
                seenPairs.add(pairKey)
            }
        } catch (error) {
            // If we can't reconstruct the vote, mark it as problematic
            console.warn(`Failed to reconstruct vote ${vote.rowKey}:`, error)
            duplicateVoteIds.add(vote.rowKey)
        }
    }

    return duplicateVoteIds
}

/**
 * Calculates positional bias in V1 algorithm
 * V1 used random shuffling which could introduce systematic bias
 */
export function calculateV1Bias(
    votes: VoteRecord[],
    session: VotingSession,
    talks: TalkVotingData[],
): {
    biasDetected: boolean
    earlyTalkAdvantage: number
    positionCorrelation: number
} {
    if (getAlgorithmVersionFromSession(session) !== 1) {
        return { biasDetected: false, earlyTalkAdvantage: 0, positionCorrelation: 0 }
    }

    const talkWins = new Map<number, number>()
    const talkAppearances = new Map<number, number>()

    // Initialize counters
    for (let i = 0; i < talks.length; i++) {
        talkWins.set(i, 0)
        talkAppearances.set(i, 0)
    }

    // Count wins and appearances for each talk
    for (const vote of votes) {
        if (vote.voteVersion !== undefined) continue // Skip V3 votes
        if (vote.vote === 'S') continue // Skip skipped votes

        try {
            const [leftIndex, rightIndex] = reconstructVoteContext(vote, session, talks)

            talkAppearances.set(leftIndex, (talkAppearances.get(leftIndex) || 0) + 1)
            talkAppearances.set(rightIndex, (talkAppearances.get(rightIndex) || 0) + 1)

            if (vote.vote === 'A') {
                talkWins.set(leftIndex, (talkWins.get(leftIndex) || 0) + 1)
            } else if (vote.vote === 'B') {
                talkWins.set(rightIndex, (talkWins.get(rightIndex) || 0) + 1)
            }
        } catch (error) {
            // Skip votes we can't reconstruct
            continue
        }
    }

    // Calculate win rates by position
    const earlyTalks = Math.floor(talks.length * 0.25) // First 25%
    const lateTalks = Math.floor(talks.length * 0.75) // Last 25%

    let earlyWinRate = 0
    let lateWinRate = 0
    let earlyCount = 0
    let lateCount = 0

    for (let i = 0; i < talks.length; i++) {
        const appearances = talkAppearances.get(i) || 0
        const wins = talkWins.get(i) || 0
        const winRate = appearances > 0 ? wins / appearances : 0

        if (i < earlyTalks) {
            earlyWinRate += winRate
            earlyCount++
        } else if (i >= lateTalks) {
            lateWinRate += winRate
            lateCount++
        }
    }

    earlyWinRate = earlyCount > 0 ? earlyWinRate / earlyCount : 0
    lateWinRate = lateCount > 0 ? lateWinRate / lateCount : 0

    const earlyTalkAdvantage = earlyWinRate - lateWinRate
    const biasDetected = Math.abs(earlyTalkAdvantage) > 0.05 // 5% threshold

    return {
        biasDetected,
        earlyTalkAdvantage,
        positionCorrelation: earlyTalkAdvantage, // Simplified correlation metric
    }
}

/**
 * Filters votes based on data quality issues for the specific algorithm version
 */
export function filterVotesForQuality(
    votes: VoteRecord[],
    session: VotingSession,
    talks: TalkVotingData[],
): {
    cleanedVotes: VoteRecord[]
    report: DataQualityReport
} {
    const algorithmVersion = getAlgorithmVersionFromSession(session)
    let cleanedVotes = [...votes]
    let duplicatesRemoved = 0
    let biasDetected = false

    // V2: Remove duplicate pairs
    if (algorithmVersion === 2) {
        const duplicateIds = detectV2Duplicates(votes, session, talks)
        cleanedVotes = votes.filter((vote) => !duplicateIds.has(vote.rowKey))
        duplicatesRemoved = duplicateIds.size
    }

    // V1: Detect bias (but keep all votes, just flag the bias)
    if (algorithmVersion === 1) {
        const biasAnalysis = calculateV1Bias(votes, session, talks)
        biasDetected = biasAnalysis.biasDetected
        // Note: We keep all V1 votes but document the bias for ELO weighting
    }

    // V3: No filtering needed - high quality data

    const report: DataQualityReport = {
        totalVotes: votes.length,
        filteredVotes: cleanedVotes.length,
        duplicatesRemoved,
        biasDetected,
        algorithmVersion,
    }

    return { cleanedVotes, report }
}
