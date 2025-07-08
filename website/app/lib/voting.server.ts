import type { GetTableEntityResponse, TableClient, TableServiceClient } from '@azure/data-tables'
import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { FairPairingGeneratorV4 } from './pairing-generator-v4'
import { recordException } from './record-exception'
import type { SessionId } from './session.server'
import { votingStorage } from './session.server'
import { getConfSessions } from './sessionize.server'
import type { VotingBatchData } from './voting-api-types'
import { CURRENT_SESSION_VERSION, CURRENT_VOTE_VERSION, type CurrentSessionVersion, type CurrentVoteVersion } from './voting-version-constants'

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

// Helper function to get year-specific table name
export function getVotesTableName(year: string): string {
    return `Votes${year}`
}

// Global voting counter record
export interface VotingGlobal {
    partitionKey: 'ddd'
    rowKey: 'voting'
    numberSessions: number
}

export type VoteIndex = number

export interface BaseVoteRecord {
    partitionKey: `session_${SessionId}`
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
}

// V1 vote records - used simple voteIndex
export interface VoteRecordLegacy extends BaseVoteRecord {
    voteVersion: undefined
    rowKey: `vote_${number}` // vote_{voteIndex}
    voteIndex: number
}

// V2 vote records - round-based with indexInRound
export interface VoteRecordV2 extends BaseVoteRecord {
    voteVersion: 2
    rowKey: `vote_${number}_${number}` // vote_{roundNumber}_{indexInRound}
    roundNumber: number // Which round this vote belongs to
    indexInRound: number // Position within the round (0-based)
}

// Union type for all vote records
export type VoteRecord = VoteRecordLegacy | VoteRecordV2

// Compile-time assertions to ensure constants match types
type _AssertCurrentVoteVersion = CurrentVoteVersion extends VoteRecordV2['voteVersion'] ? true : never
type _AssertCurrentSessionVersion = CurrentSessionVersion extends VotingSessionV4['version'] ? true : never
const _voteVersionAssertion: _AssertCurrentVoteVersion = true
const _sessionVersionAssertion: _AssertCurrentSessionVersion = true
// Prevent unused variable warnings
void _voteVersionAssertion
void _sessionVersionAssertion

// Base interface for all voting sessions
export interface BaseVotingSession {
    partitionKey: 'session'
    rowKey: `session_${SessionId}`
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

// V2 adds version, V2 sessions used V2 of the algorithm
export interface VotingSessionV2 extends BaseVotingSession {
    version: 2
}

// V3 voting sessions - round-based pairing (has indexing bug)
export interface VotingSessionV3 extends BaseVotingSession {
    version: 3
    roundNumber: number // Current round (starts at 0)
    maxPairsPerRound: number // Calculated from talk count
}

// V4 voting sessions - round-based pairing with fixed indexing (current)
export interface VotingSessionV4 extends BaseVotingSession {
    version: 4
    roundNumber: number // Current round (starts at 0)
    maxPairsPerRound: number // Calculated from talk count
}

// Union type for all voting sessions
export type VotingSession = VotingSessionV1 | VotingSessionV2 | VotingSessionV3 | VotingSessionV4

const tableClients = new Map<string, Promise<TableClient>>()

// Helper function to ensure year-specific votes table exists
export async function ensureVotesTableExists(
    tableServiceClient: TableServiceClient,
    createTableClient: (tableName: string) => TableClient,
    year: string,
) {
    const tableName = getVotesTableName(year)
    const tableClient = tableClients.get(year)
    if (tableClient) {
        return tableClient
    }

    const createTablePromise = tableServiceClient.createTable(tableName, {
        onResponse: (response) => {
            if (response.status === 409) {
                console.log(`Table ${tableName} already exists`)
            }
        },
    })

    const createClientPromise = createTablePromise.then(() => createTableClient(tableName))

    tableClients.set(year, createClientPromise)
    createClientPromise.catch((error) => {
        recordException(error)
        tableClients.delete(year) // Remove stale entry on rejection
        throw error // Rethrow the error to propagate it
    })
    return createClientPromise
}

// Function to get next session number and increment counter
export async function incrementNumberSessions(votesTableClient: TableClient): Promise<void> {
    const maxRetries = 5
    let attempt = 0
    while (attempt < maxRetries) {
        try {
            const partitionKey: VotingGlobal['partitionKey'] = 'ddd'
            const rowKey: VotingGlobal['rowKey'] = 'voting'
            // Try to get existing counter
            const entity = (await votesTableClient.getEntity(
                partitionKey,
                rowKey,
            )) as GetTableEntityResponse<VotingGlobal>
            const currentNumber = entity.numberSessions || 0
            const nextNumber = currentNumber + 1

            const dddVoting: VotingGlobal = {
                partitionKey,
                rowKey,
                numberSessions: nextNumber,
            }
            // Update the counter using optimistic concurrency (ETag)
            await votesTableClient.updateEntity(dddVoting, 'Merge', {
                etag: entity.etag,
            })
            return
        } catch (error: any) {
            // If not found, create the counter
            if (error.statusCode === 404) {
                try {
                    const votingGlobal: VotingGlobal = {
                        partitionKey: 'ddd',
                        rowKey: 'voting',
                        numberSessions: 1,
                    }
                    await votesTableClient.upsertEntity(votingGlobal)
                    return
                } catch (createError: any) {
                    // If this is a concurrency error, retry
                    if (isConcurrencyError(createError)) {
                        attempt++
                        continue
                    }
                    recordException(createError)
                    throw createError
                }
            }
            // Retry only on concurrency errors (409 or precondition failed)
            if (isConcurrencyError(error)) {
                attempt++
                continue
            }
            recordException(error)
            throw error
        }
    }
    // If we reach here, all retries failed
    const err = new Error('Failed to increment numberSessions due to repeated concurrency conflicts.')
    recordException(err)
    throw err
}

function isConcurrencyError(error: any): boolean {
    // Azure Table Storage uses statusCode 409 for conflicts
    // and sometimes 412 for precondition failed
    return error?.statusCode === 409 || error?.statusCode === 412
}

export async function recordVoteInTable(
    votesTableClient: TableClient,
    sessionId: SessionId,
    roundNumber: number,
    indexInRound: number,
    vote: 'A' | 'B' | 'skip',
): Promise<void> {
    const voteChar = vote === 'skip' ? 'S' : vote

    const voteRecord: VoteRecordV2 = {
        voteVersion: CURRENT_VOTE_VERSION,
        partitionKey: `session_${sessionId}`,
        rowKey: `vote_${roundNumber}_${indexInRound}`,
        roundNumber,
        indexInRound,
        vote: voteChar,
        timestamp: new Date().toISOString(),
    }

    // Create the vote record
    await votesTableClient.createEntity(voteRecord)

    // Update currentIndex on session record with race condition protection
    await updateSessionIndexSafely(votesTableClient, sessionId, roundNumber, indexInRound + 1)
}

/**
 * Safely updates the session's currentIndex with optimistic concurrency control
 * Only updates if the new index is higher and we're still in the same round
 * Advances to next round if the current round is completed
 */
async function updateSessionIndexSafely(
    votesTableClient: TableClient,
    sessionId: SessionId,
    voteRoundNumber: number,
    newCurrentIndex: number,
    maxRetries = 5,
): Promise<void> {
    let attempt = 0

    while (attempt < maxRetries) {
        try {
            // Fetch current session state with ETag for optimistic concurrency
            const partitionKey: VotingSessionV4['partitionKey'] = 'session'
            const rowKey: VotingSessionV4['rowKey'] = `session_${sessionId}`
            const sessionEntity = (await votesTableClient.getEntity(
                partitionKey,
                rowKey,
            )) as GetTableEntityResponse<VotingSession>

            if (sessionEntity.version !== CURRENT_SESSION_VERSION) {
                throw new Error(`Cannot update session index for non-V${CURRENT_SESSION_VERSION} session`)
            }

            // Parse current session state
            const currentRoundNumber = sessionEntity.roundNumber
            const currentIndex = sessionEntity.currentIndex

            // Handle vote-driven round advancement
            let updatedSession: (Pick<VotingSession, 'partitionKey' | 'rowKey'> & Partial<VotingSession>) | null = null

            if (voteRoundNumber === currentRoundNumber) {
                // Vote is for current round - normal case
                if (newCurrentIndex > currentIndex) {
                    updatedSession = {
                        partitionKey,
                        rowKey,
                        currentIndex: newCurrentIndex,
                    }
                }
                // If newCurrentIndex <= currentIndex, this is out-of-order, skip
            } else if (voteRoundNumber > currentRoundNumber) {
                // Vote is for a future round - advance session to that round
                // This happens when getCurrentVotingBatch served pairs from next round
                // and user voted on them, triggering round advancement
                updatedSession = {
                    partitionKey,
                    rowKey,
                    roundNumber: voteRoundNumber, // Advance to vote's round
                    currentIndex: newCurrentIndex, // Set index within new round
                }
            }
            // If voteRoundNumber < currentRoundNumber, this is a stale vote, skip

            if (updatedSession) {
                // Use ETag for optimistic concurrency control
                await votesTableClient.updateEntity(updatedSession, 'Merge', {
                    etag: sessionEntity.etag,
                })
            }

            return // Success or intentional skip
        } catch (error: any) {
            // Check if this is a concurrency error (ETag mismatch)
            if (isConcurrencyError(error)) {
                attempt++
                if (attempt >= maxRetries) {
                    console.warn(`Failed to update session index after ${maxRetries} attempts for session ${sessionId}`)
                    return // Give up gracefully - the vote was still recorded
                }

                // Add random delay to reduce thundering herd effect
                // Possible range: 0 <= delay < 2^attempt * 100 (ms)
                // - Math.random() returns [0, 1)
                // - For attempt = 1: 0 <= delay < 200ms
                // - For attempt = 2: 0 <= delay < 400ms
                // - For attempt = 3: 0 <= delay < 800ms
                // etc.
                const delay = Math.random() * Math.pow(2, attempt) * 100 // Exponential backoff with jitter
                await new Promise((resolve) => setTimeout(resolve, delay))
                continue
            }

            // Non-concurrency error - log and give up
            console.error(`Error updating session index for ${sessionId}:`, error)
            recordException(error)
            return // Don't fail the vote recording over session index update
        }
    }
}

export async function getVotingSession(
    request: Request,
    votesTableClient: TableClient,
    getCurrentSessions: () => Promise<TalkVotingData[]>,
): Promise<VotingSession> {
    try {
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        const partitionKey: VotingSession['partitionKey'] = 'session'
        const rowKey: VotingSession['rowKey'] = `session_${sessionId}`
        const entity = (await votesTableClient.getEntity(partitionKey, rowKey)) as GetTableEntityResponse<VotingSession>

        // Create base session object with common properties
        const baseSession: BaseVotingSession = {
            partitionKey,
            rowKey,
            sessionId: entity.sessionId,
            seed: entity.seed,
            totalPairs: entity.totalPairs,
            inputSessionizeTalkIdsJson: entity.inputSessionizeTalkIdsJson,
            currentIndex: entity.currentIndex,
            createdAt: entity.createdAt,
        }

        // Create appropriate session type based on session version
        if (entity.version === undefined) {
            // V1: Original sessions had no version field
            const v1Session: VotingSessionV1 = {
                ...baseSession,
                version: undefined,
            }
            return v1Session
        }

        if (entity.version === 2) {
            const v2Session: VotingSessionV2 = {
                ...baseSession,
                version: entity.version,
            }
            return v2Session
        }

        if (entity.version === 3) {
            const v3Session: VotingSessionV3 = {
                ...baseSession,
                version: entity.version,
                roundNumber: entity.roundNumber,
                maxPairsPerRound: entity.maxPairsPerRound,
            }

            return v3Session
        }

        if (entity.version === CURRENT_SESSION_VERSION) {
            const v4Session: VotingSessionV4 = {
                ...baseSession,
                version: entity.version,
                roundNumber: entity.roundNumber,
                maxPairsPerRound: entity.maxPairsPerRound,
            }

            return v4Session
        }

        // @ts-expect-error exhaustive check
        throw new Error(`Unknown session version: ${entity.version}`)
    } catch (error: any) {
        if (error.statusCode === 404) {
            await createUserVotingSessionAndRedirect(request, votesTableClient, await getCurrentSessions())
        }
        throw error
    }
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
    votesTableClient: TableClient,
    currentSessions: TalkVotingData[],
): Promise<void> {
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

    // Create session in table storage
    const sessionRecord: VotingSessionV4 = {
        partitionKey: 'session',
        rowKey: `session_${sessionId}`,
        sessionId,
        seed,
        totalPairs,
        inputSessionizeTalkIdsJson: JSON.stringify(currentSessionIds),
        currentIndex: 0,
        createdAt: new Date().toISOString(),
        version: CURRENT_SESSION_VERSION,
        roundNumber: 0,
        maxPairsPerRound,
    }

    await votesTableClient.upsertEntity(sessionRecord)
    await incrementNumberSessions(votesTableClient)

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
    const sessionGroups = await getConfSessions({
        sessionizeEndpoint: allSessionsEndpoint,
        confTimeZone: conferenceConfigPublic.timezone,
    })

    // Filter out service sessions and extract regular sessions
    const regularSessions: TalkVotingData[] = []
    for (const group of sessionGroups) {
        for (const session of group.sessions) {
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
    }

    return regularSessions.sort((a, b) => a.id.localeCompare(b.id))
}
