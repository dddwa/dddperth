import type { GetTableEntityResponse, TableClient, TableServiceClient } from '@azure/data-tables'
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
export interface VotingGlobal {
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

// Interface for table storage (arrays converted to JSON strings)
export interface VotingSession {
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

    const votingSession: Pick<VotingSession, 'partitionKey' | 'rowKey'> & Partial<VotingSession> = {
        partitionKey: 'session',
        rowKey: `session_${sessionId}`,
        currentIndex: voteIndex + 1,
    }
    // Update currentIndex on the session record using merge strategy
    await votesTableClient.updateEntity(votingSession, 'Merge')
}

export async function getVotingSession(
    request: Request,
    votesTableClient: TableClient,
    currentSessions: TalkVotingData[],
): Promise<VotingSession> {
    try {
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        const partitionKey: VotingSession['partitionKey'] = 'session'
        const rowKey: VotingSession['rowKey'] = `session_${sessionId}`
        const entity = (await votesTableClient.getEntity(partitionKey, rowKey)) as GetTableEntityResponse<VotingSession>

        return {
            partitionKey,
            rowKey,
            sessionId: entity.sessionId,
            seed: entity.seed,
            totalPairs: entity.totalPairs,
            inputSessionizeTalkIdsJson: entity.inputSessionizeTalkIdsJson,
            currentIndex: entity.currentIndex,
            createdAt: entity.createdAt,
            version: entity.version ?? 1, // Default to v1 if not specified
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

    // Calculate total pairs using generator
    const totalTalks = currentSessions.length
    const tempGenerator = new FairPairingGenerator(totalTalks, 0)
    const totalPairs = tempGenerator.getTotalPairs()

    // Create session in table storage
    const sessionRecord: VotingSession = {
        partitionKey: 'session',
        rowKey: `session_${sessionId}`,
        sessionId,
        seed,
        totalPairs,
        inputSessionizeTalkIdsJson: JSON.stringify(currentSessionIds),
        currentIndex: 0,
        createdAt: new Date().toISOString(),
        version: 2, // Use v2 algorithm (no talk repetition) for new sessions
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
    votingSession: VotingSession,
    batchSize = 50,
    fromIndex?: number,
): Promise<{ pairs: TalkPair[]; currentIndex: number; hasMore: boolean }> {
    const currentSessionIds = extractSessionIds(currentSessions)

    // Check if sessions have changed
    if (hasSessionsChanged(currentSessionIds, JSON.parse(votingSession.inputSessionizeTalkIdsJson))) {
        console.warn('Sessions have changed since voting started, clearing session and redirecting')
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        votingStorageSession.set('sessionId', undefined)

        throw redirect($path('/voting'), {
            headers: {
                'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
            },
        })
    }

    // Check if this is an old v1 session - if so, reset it to v2
    if ((votingSession.version ?? 1) === 1) {
        console.warn('Session uses v1 algorithm, resetting to v2 due to algorithm change')
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        votingStorageSession.set('sessionId', undefined)

        throw redirect($path('/voting'), {
            headers: {
                'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
            },
        })
    }

    // Generate pairs using FairPairingGenerator (no talk repetition within batch)
    const generator = new FairPairingGenerator(currentSessions.length, votingSession.seed)
    const startPosition = fromIndex ?? votingSession.currentIndex

    // Check if session is complete (all pairs have been shown)
    if (startPosition >= generator.getTotalPairs()) {
        console.log('All pairs have been shown, resetting session')
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        votingStorageSession.set('sessionId', undefined)

        throw redirect($path('/voting'), {
            headers: {
                'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
            },
        })
    }

    const pairIndices = generator.getNextPairs(startPosition, batchSize)

    // Convert indices to TalkPair objects
    const pairs: TalkPair[] = pairIndices.map(([leftIndex, rightIndex], index) => ({
        index: startPosition + index,
        left: currentSessions[leftIndex],
        right: currentSessions[rightIndex],
    }))

    // Check if there are more pairs available beyond this batch
    const nextPosition = generator.getCurrentPosition()
    const hasMore = nextPosition < generator.getTotalPairs()

    return {
        pairs,
        currentIndex: nextPosition,
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
