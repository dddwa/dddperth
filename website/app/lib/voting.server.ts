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
import { FairPairingGeneratorV5 } from './pairing-generator-v5'
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

// Current vote record format - round-based with indexInRound
export interface VoteRecord extends BaseVoteRecord {
    voteVersion: typeof CURRENT_VOTE_VERSION
    roundNumber: number
    indexInRound: number
}

export interface VotingSession {
    sessionId: SessionId
    seed: number
    totalPairs: number
    inputSessionizeTalkIdsJson: string // JSON string of talk IDs
    currentIndex: VoteIndex
    createdAt: string
    version: typeof CURRENT_SESSION_VERSION
    roundNumber: number
    maxPairsPerRound: number
}

// Convert D1 row to VotingSession
function rowToVotingSession(row: VotingSessionRow): VotingSession {
    if (row.version !== CURRENT_SESSION_VERSION) {
        throw new Error(`Unsupported voting session version: ${row.version}`)
    }

    return {
        sessionId: row.session_id,
        seed: row.seed,
        totalPairs: row.total_pairs,
        inputSessionizeTalkIdsJson: row.input_sessionize_talk_ids_json,
        currentIndex: row.current_index,
        createdAt: row.created_at,
        version: CURRENT_SESSION_VERSION,
        roundNumber: row.round_number,
        maxPairsPerRound: row.max_pairs_per_round,
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
    const session = await getVotingSessionById(db, sessionId)

    if (!session || session.version !== CURRENT_SESSION_VERSION) {
        throw new Error(`Cannot record vote for unknown or non-V${CURRENT_SESSION_VERSION} session`)
    }

    if (roundNumber < 0 || indexInRound < 0 || indexInRound >= session.max_pairs_per_round) {
        throw new Error(`Invalid V${CURRENT_SESSION_VERSION} vote position: round ${roundNumber}, index ${indexInRound}`)
    }

    // Record the vote
    await recordVote(db, sessionId, year, roundNumber, indexInRound, voteChar)

    // Update session index safely
    await updateSessionIndexSafely(db, sessionId, roundNumber, indexInRound + 1)
}

/**
 * Safely updates the session's currentIndex
 * Only updates if the new index is higher and we're still in the no-repeat session pass.
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
            // Vote is for a later no-repeat round - advance session to that round.
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

    const row = await getVotingSessionById(db, sessionId)

    if (!row || row.version !== CURRENT_SESSION_VERSION) {
        await createUserVotingSessionAndRedirect(request, db, year, await getCurrentSessions())
    }

    return rowToVotingSession(row)
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

    // Generate new session ID and use the global session number as the seed.
    // V5 relies on sequential seeds to rotate matchings and early pair order.
    const sessionId = crypto.randomUUID()
    const seed = await incrementSessionCounter(db, year)

    // Calculate total pairs using generator
    const totalTalks = currentSessions.length
    const tempGenerator = new FairPairingGeneratorV5(totalTalks, seed)
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
    if (votingSession.maxPairsPerRound <= 0) {
        return {
            pairs: [],
            currentIndex: requestedIndexInRound,
            newRound: false,
            exhausted: true,
        }
    }

    let pairs: TalkPair[] = []
    let roundNumber = requestedRoundNumber
    let indexInRound = requestedIndexInRound
    let pairsNeeded = batchSize
    let startedNewRound = roundNumber > votingSession.roundNumber

    while (pairsNeeded > 0) {
        const generator = new FairPairingGeneratorV5(currentSessions.length, votingSession.seed, roundNumber)

        if (generator.isRoundComplete(indexInRound)) {
            roundNumber++
            indexInRound = 0
            startedNewRound = true
            continue
        }

        const remainingInRound = votingSession.maxPairsPerRound - indexInRound
        const pairsToFetch = Math.min(pairsNeeded, remainingInRound)
        const pairsWithPositions = generator.getPairs(indexInRound, pairsToFetch)
        const newPairs = pairsWithPositions.map(({ pair: [leftIndex, rightIndex], position }) => ({
            index: position,
            roundNumber,
            left: currentSessions[leftIndex],
            right: currentSessions[rightIndex],
        }))

        if (pairsWithPositions.length > 0) {
            indexInRound = Math.max(...pairsWithPositions.map((pair) => pair.position)) + 1
        }

        pairs = pairs.concat(newPairs)
        pairsNeeded -= newPairs.length

        if (pairsNeeded <= 0) {
            break
        }

        roundNumber++
        indexInRound = 0
        startedNewRound = true
    }

    return {
        pairs,
        currentIndex: indexInRound,
        newRound: startedNewRound,
        exhausted: false,
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
