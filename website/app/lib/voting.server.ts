import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import {
    createVotingSession,
    getVotesForSession,
    getVotingSessionById,
    incrementSessionCounter,
    recordVote,
    updateVotingSessionIndex,
    type VoteRow,
    type VotingSessionRow,
} from './d1.server'
import { FairPairingGeneratorV4 } from './pairing-generator-v4'
import type { SessionId } from './session.server'
import { votingStorage } from './session.server'
import { getConfSessions } from './sessionize.server'
import type { VotingBatchData } from './voting-api-types'
import { CURRENT_SESSION_VERSION, CURRENT_VOTE_VERSION } from './voting-version-constants'

export interface TalkPair {
    index: number
    roundNumber: number
    left: TalkVotingData
    right: TalkVotingData
}

export interface TalkVotingData {
    id: string
    title: string
    description: string | null
    tags: string[]
}

export interface VotingPairs {
    sessionId: string
    year: string
    pairs: TalkPair[]
    createdAt: string
}

// Global voting counter record (for D1 compatibility)
export interface VotingGlobal {
    year: string
    numberSessions: number
}

export type VoteIndex = number

export interface BaseVoteRecord {
    sessionId: SessionId
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
}

// V2 vote records - round-based with indexInRound
export interface VoteRecordV2 extends BaseVoteRecord {
    voteVersion: 2
    roundNumber: number
    indexInRound: number
}

// Union type for all vote records
export type VoteRecord = VoteRecordV2

// Base interface for all voting sessions
export interface BaseVotingSession {
    sessionId: SessionId
    seed: number
    totalPairs: number
    inputSessionizeTalkIdsJson: string // JSON string of talk IDs
    currentIndex: VoteIndex
    createdAt: string
    version?: number
}

export interface VotingSessionV1 extends BaseVotingSession {
    version: undefined
}

export interface VotingSessionV2 extends BaseVotingSession {
    version: 2
}

export interface VotingSessionV3 extends BaseVotingSession {
    version: 3
    roundNumber: number
    maxPairsPerRound: number
}

export interface VotingSessionV4 extends BaseVotingSession {
    version: 4
    roundNumber: number
    maxPairsPerRound: number
}

// Union type for all voting sessions
export type VotingSession = VotingSessionV1 | VotingSessionV2 | VotingSessionV3 | VotingSessionV4

// Convert D1 row to VotingSession
function rowToVotingSession(row: VotingSessionRow): VotingSession {
    const base: BaseVotingSession = {
        sessionId: row.session_id,
        seed: row.seed,
        totalPairs: row.total_pairs,
        inputSessionizeTalkIdsJson: row.input_sessionize_talk_ids_json,
        currentIndex: row.current_index,
        createdAt: row.created_at,
    }

    if (row.version === 4) {
        return {
            ...base,
            version: 4,
            roundNumber: row.round_number,
            maxPairsPerRound: row.max_pairs_per_round,
        }
    }

    if (row.version === 3) {
        return {
            ...base,
            version: 3,
            roundNumber: row.round_number,
            maxPairsPerRound: row.max_pairs_per_round,
        }
    }

    if (row.version === 2) {
        return {
            ...base,
            version: 2,
        }
    }

    return {
        ...base,
        version: undefined,
    }
}

// Convert D1 vote row to VoteRecord
function rowToVoteRecord(row: VoteRow): VoteRecord {
    return {
        voteVersion: CURRENT_VOTE_VERSION,
        sessionId: row.session_id,
        roundNumber: row.round_number,
        indexInRound: row.index_in_round,
        vote: row.vote,
        timestamp: row.created_at,
    }
}

// Record vote in D1
export async function recordVoteInTable(
    db: D1Database,
    sessionId: SessionId,
    year: string,
    roundNumber: number,
    indexInRound: number,
    vote: 'A' | 'B' | 'skip',
): Promise<void> {
    const voteChar = vote === 'skip' ? 'S' : vote

    // Record the vote
    await recordVote(db, sessionId, year, roundNumber, indexInRound, voteChar)

    // Update session index safely
    await updateSessionIndexSafely(db, sessionId, roundNumber, indexInRound + 1)
}

/**
 * Safely updates the session's currentIndex
 * Only updates if the new index is higher and we're still in the same round
 * Advances to next round if the current round is completed
 */
async function updateSessionIndexSafely(
    db: D1Database,
    sessionId: SessionId,
    voteRoundNumber: number,
    newCurrentIndex: number,
): Promise<void> {
    try {
        // Fetch current session state
        const session = await getVotingSessionById(db, sessionId)

        if (!session) {
            console.warn(`Session not found: ${sessionId}`)
            return
        }

        if (session.version !== CURRENT_SESSION_VERSION) {
            throw new Error(`Cannot update session index for non-V${CURRENT_SESSION_VERSION} session`)
        }

        const currentRoundNumber = session.round_number
        const currentIndex = session.current_index

        if (voteRoundNumber === currentRoundNumber) {
            // Vote is for current round - normal case
            if (newCurrentIndex > currentIndex) {
                await updateVotingSessionIndex(db, sessionId, newCurrentIndex)
            }
        } else if (voteRoundNumber > currentRoundNumber) {
            // Vote is for a future round - advance session to that round
            await updateVotingSessionIndex(db, sessionId, newCurrentIndex, voteRoundNumber)
        }
        // If voteRoundNumber < currentRoundNumber, this is a stale vote, skip
    } catch (error) {
        console.error(`Error updating session index for ${sessionId}:`, error)
        // Don't fail the vote recording over session index update
    }
}

export async function getVotingSession(
    request: Request,
    db: D1Database,
    year: string,
    getCurrentSessions: () => Promise<TalkVotingData[]>,
): Promise<VotingSession> {
    const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
    const sessionId = votingStorageSession.get('sessionId')

    if (!sessionId) {
        await createUserVotingSessionAndRedirect(request, db, year, await getCurrentSessions())
    }

    const row = await getVotingSessionById(db, sessionId!)

    if (!row) {
        await createUserVotingSessionAndRedirect(request, db, year, await getCurrentSessions())
    }

    return rowToVotingSession(row!)
}

// Function to check if input sessions have changed
export function hasSessionsChanged(currentSessionIds: string[], storedSessionIds: string[]): boolean {
    if (currentSessionIds.length !== storedSessionIds.length) {
        return true
    }

    // Sort both arrays to compare regardless of order
    const sortedCurrent = [...currentSessionIds].sort()
    const sortedStored = [...storedSessionIds].sort()

    return !sortedCurrent.every((id, index) => id === sortedStored[index])
}

// Function to get session IDs from SessionData array
export function extractSessionIds(sessions: TalkVotingData[]): string[] {
    return sessions.map((session) => session.id)
}

// Create new user voting session and redirect back to voting page
export async function createUserVotingSessionAndRedirect(
    request: Request,
    db: D1Database,
    year: string,
    currentSessions: TalkVotingData[],
): Promise<never> {
    const currentSessionIds = extractSessionIds(currentSessions)

    if (currentSessions.length === 0) {
        throw new Error('No sessions available for voting')
    }

    // Generate new session ID and seed
    const sessionId = crypto.randomUUID()
    const seed = crypto.getRandomValues(new Uint32Array(1))[0]

    // Calculate total pairs using generator
    const totalTalks = currentSessions.length
    const tempGenerator = new FairPairingGeneratorV4(totalTalks, 0)
    const totalPairs = tempGenerator.getTotalPairs()
    const maxPairsPerRound = tempGenerator.getMaxPairsPerRound()

    const now = new Date().toISOString()

    // Create session in D1
    await createVotingSession(db, {
        session_id: sessionId,
        year,
        seed,
        total_pairs: totalPairs,
        input_sessionize_talk_ids_json: JSON.stringify(currentSessionIds),
        current_index: 0,
        version: CURRENT_SESSION_VERSION,
        round_number: 0,
        max_pairs_per_round: maxPairsPerRound,
        created_at: now,
        updated_at: now,
    })

    await incrementSessionCounter(db, year)

    const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
    votingStorageSession.set('sessionId', sessionId)

    throw redirect($path('/voting'), {
        headers: {
            'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
        },
    })
}

// Get batch of talk pairs for specific round and index
export async function getVotingBatchExplicit(
    currentSessions: TalkVotingData[],
    votingSession: VotingSession,
    requestedRoundNumber: number,
    requestedIndexInRound: number,
    batchSize = 50,
): Promise<VotingBatchData> {
    // Only works with current version sessions
    if (votingSession.version !== CURRENT_SESSION_VERSION) {
        throw new Error(`Explicit batch fetching only supports V${CURRENT_SESSION_VERSION} sessions`)
    }

    const maxPairsPerRound = votingSession.maxPairsPerRound

    let pairs: TalkPair[] = []
    let roundNumber = requestedRoundNumber
    let indexInRound = requestedIndexInRound
    let pairsNeeded = batchSize
    let startedNewRound = roundNumber > votingSession.roundNumber

    while (pairsNeeded > 0) {
        // If we've exceeded the total number of rounds (all pairs done), break
        if (roundNumber < 0 || maxPairsPerRound <= 0) break

        // V4: Use fixed generator with correct position tracking
        const roundSeed = FairPairingGeneratorV4.generateRoundSeed(votingSession.seed, roundNumber)
        const roundGenerator = new FairPairingGeneratorV4(currentSessions.length, roundSeed)

        // Check if this round is complete
        if (roundGenerator.isRoundComplete(indexInRound)) {
            // Advance to next round
            roundNumber++
            indexInRound = 0
            startedNewRound = true
            continue
        }

        const remainingInRound = maxPairsPerRound - indexInRound
        const pairsToFetch = Math.min(pairsNeeded, remainingInRound)
        const pairsWithPositions = roundGenerator.getPairs(indexInRound, pairsToFetch)

        // Convert indices to TalkPair objects using actual positions
        const newPairs = pairsWithPositions.map(({ pair: [leftIndex, rightIndex], position }) => ({
            index: position, // Use actual position in generator sequence
            roundNumber: roundNumber, // Round these pairs belong to
            left: currentSessions[leftIndex],
            right: currentSessions[rightIndex],
        }))

        // Update indexInRound to continue from the last position used + 1
        if (pairsWithPositions.length > 0) {
            const lastPosition = Math.max(...pairsWithPositions.map((p) => p.position))
            indexInRound = lastPosition + 1
        }

        pairs = pairs.concat(newPairs)
        pairsNeeded -= newPairs.length

        // If we filled the batch, break
        if (pairsNeeded <= 0) break
        // Otherwise, advance to next round
        roundNumber++
        indexInRound = 0
        startedNewRound = true
    }

    return {
        pairs,
        currentIndex: indexInRound,
        newRound: startedNewRound,
    }
}

export async function getSessionsForVoting(allSessionsEndpoint: string) {
    const sessions = await getConfSessions({
        sessionizeEndpoint: allSessionsEndpoint,
    })

    // Filter out service sessions and extract regular sessions
    const regularSessions: TalkVotingData[] = []
    for (const session of sessions) {
        if (!session.isServiceSession && !session.isPlenumSession) {
            regularSessions.push({
                id: session.id,
                title: session.title,
                description: session.description,
                tags: session.categories.reduce((tags, category) => {
                    if (category.name === 'General Topic Category' || category.name === 'Talk Topics') {
                        return tags.concat(category.categoryItems.map((item) => item.name))
                    }

                    return tags
                }, [] as string[]),
            })
        }
    }

    return regularSessions.sort((a, b) => a.id.localeCompare(b.id))
}

// Export helpers for validation to use
export { getVotesForSession, rowToVoteRecord, rowToVotingSession }
