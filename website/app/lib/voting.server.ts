import type { TableClient, TableServiceClient } from '@azure/data-tables'
import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { FairPairingGenerator } from './pairing-generator'
import { recordException } from './record-exception'
import type { SessionId } from './session.server'
import { votingStorage } from './session.server'
import { getConfSessions } from './sessionize.server'

export interface TalkPair {
    index: number
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
export interface VotingCounterRecord {
    partitionKey: 'ddd'
    rowKey: 'voting'
    numberSessions: number
}

export type VoteIndex = number

// New interface for individual vote records
export interface VoteRecord {
    // Table storage keys
    partitionKey: `session_${SessionId}`
    rowKey: `vote_${VoteIndex}`

    // Vote data
    voteIndex: VoteIndex // Index of the vote pair
    vote: 'A' | 'B' | 'S' // A = talk1, B = talk2, S = skipped
    timestamp: string
}

// New interface for user session records
export interface UserVotingRecord {
    // Table storage keys
    partitionKey: `session_${SessionId}`
    rowKey: 'session'

    // Session data
    sessionId: SessionId
    seed: number // Random seed for deterministic pair generation
    totalPairs: number // Total possible pairs for this session
    inputSessionizeTalkIds: string[] // Array of talk IDs for change detection and results hydration
    currentIndex: VoteIndex
    createdAt: string
}

// Interface for table storage (arrays converted to JSON strings)
interface UserVotingRecordStorage {
    partitionKey: `session_${SessionId}`
    rowKey: 'session'
    sessionId: SessionId
    seed: number
    totalPairs: number
    inputSessionizeTalkIdsJson: string // JSON string of talk IDs
    currentIndex: VoteIndex
    createdAt: string
}

// Helper function to ensure year-specific votes table exists
export async function ensureVotesTableExists(
    tableServiceClient: TableServiceClient,
    createTableClient: (tableName: string) => TableClient,
    year: string,
) {
    const tableName = getVotesTableName(year)

    await tableServiceClient.createTable(tableName, {
        onResponse: (response) => {
            if (response.status === 409) {
                console.log(`Table ${tableName} already exists`)
            }
        },
    })

    return createTableClient(tableName)
}

// Function to get next session number and increment counter
export async function incrementNumberSessions(votesTableClient: TableClient): Promise<void> {
    const maxRetries = 5
    let attempt = 0
    while (attempt < maxRetries) {
        try {
            // Try to get existing counter
            const entity = await votesTableClient.getEntity('ddd', 'voting')
            const currentNumber = (entity.numberSessions as number) || 0
            const nextNumber = currentNumber + 1

            // Update the counter using optimistic concurrency (ETag)
            await votesTableClient.updateEntity(
                {
                    partitionKey: 'ddd',
                    rowKey: 'voting',
                    numberSessions: nextNumber,
                },
                'Merge',
                {
                    etag: entity.etag,
                },
            )
            return
        } catch (error: any) {
            // If not found, create the counter
            if (error.statusCode === 404) {
                try {
                    await votesTableClient.upsertEntity({
                        partitionKey: 'ddd',
                        rowKey: 'voting',
                        numberSessions: 1,
                    })
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
    voteIndex: VoteIndex,
    vote: 'A' | 'B' | 'skip',
): Promise<void> {
    const voteChar = vote === 'skip' ? 'S' : vote

    const voteRecord: VoteRecord = {
        partitionKey: `session_${sessionId}`,
        rowKey: `vote_${voteIndex}`,
        voteIndex,
        vote: voteChar,
        timestamp: new Date().toISOString(),
    }

    // Create the vote record
    await votesTableClient.createEntity(voteRecord)

    // Update currentIndex on the session record using merge strategy
    await votesTableClient.upsertEntity(
        {
            partitionKey: `session_${sessionId}`,
            rowKey: 'session',
            currentIndex: voteIndex + 1, // Set to next index
        },
        'Merge',
    )
}

export async function getVotingSession(
    request: Request,
    votesTableClient: TableClient,
    currentSessions: TalkVotingData[],
): Promise<UserVotingRecord> {
    try {
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        const entity = await votesTableClient.getEntity(`session_${sessionId}`, 'session')
        return {
            partitionKey: entity.partitionKey as `session_${string}`,
            rowKey: entity.rowKey as 'session',
            sessionId: entity.sessionId as string,
            seed: entity.seed as number,
            totalPairs: entity.totalPairs as number,
            inputSessionizeTalkIds: JSON.parse(entity.inputSessionizeTalkIdsJson as string) as string[],
            currentIndex: entity.currentIndex as number,
            createdAt: entity.createdAt as string,
        }
    } catch (error: any) {
        if (error.statusCode === 404) {
            await createUserVotingSessionAndRedirect(request, votesTableClient, currentSessions)
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

    // Calculate total pairs
    const totalTalks = currentSessions.length
    const totalPairs = (totalTalks * (totalTalks - 1)) / 2

    // Create session in table storage
    const sessionRecord: UserVotingRecordStorage = {
        partitionKey: `session_${sessionId}`,
        rowKey: 'session',
        sessionId,
        seed,
        totalPairs,
        inputSessionizeTalkIdsJson: JSON.stringify(currentSessionIds),
        currentIndex: 0,
        createdAt: new Date().toISOString(),
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

// Get current batch of talk pairs for user
export async function getCurrentVotingBatch(
    request: Request,
    currentSessions: TalkVotingData[],
    userSession: UserVotingRecord,
    batchSize = 50,
    fromIndex?: number,
): Promise<{ pairs: TalkPair[]; currentIndex: number; hasMore: boolean }> {
    const currentSessionIds = extractSessionIds(currentSessions)

    // Check if sessions have changed
    if (hasSessionsChanged(currentSessionIds, userSession.inputSessionizeTalkIds)) {
        console.warn('Sessions have changed since voting started, clearing session and redirecting')
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        votingStorageSession.set('sessionId', undefined)

        throw redirect($path('/voting'), {
            headers: {
                'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
            },
        })
    }

    // Generate pairs using FairPairingGenerator
    const generator = new FairPairingGenerator(currentSessions.length, userSession.seed)
    const startPosition = fromIndex ?? userSession.currentIndex
    const pairIndices = generator.getNextPairs(startPosition, batchSize)

    // Convert indices to TalkPair objects
    const pairs: TalkPair[] = pairIndices.map(([leftIndex, rightIndex], index) => ({
        index: startPosition + index,
        left: currentSessions[leftIndex],
        right: currentSessions[rightIndex],
    }))

    const hasMore = startPosition + batchSize < userSession.totalPairs

    return {
        pairs,
        currentIndex: userSession.currentIndex,
        hasMore,
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
                console.log('Session', session)
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
