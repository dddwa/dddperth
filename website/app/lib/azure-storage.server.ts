import type { TableClient, TableServiceClient } from '@azure/data-tables'
import type { BlobServiceClient } from '@azure/storage-blob'
import type { Year } from './conference-state-client-safe'
import { recordException } from './record-exception'

// Types for voting system
export interface VotingSession {
    sessionId: string
    year: string
    status: 'pending' | 'active' | 'completed'
    startTime: string
    endTime?: string
    totalSessions: number
    createdAt: string
}

export interface TalkPair {
    index: number
    left: SessionData
    right: SessionData
}

export interface SessionData {
    id: string
    title: string
    description: string | null
    speakers: Array<{ id: string; name: string }>
    categories: Array<{
        id: number
        name: string
        categoryItems: Array<{ id: number; name: string }>
        sort: number | null
    }>
}

export interface VotingPairs {
    sessionId: string
    year: string
    pairs: TalkPair[]
    createdAt: string
}

export const VOTING_SESSIONS_CONTAINER = 'voting-sessions'
export const VOTES_CONTAINER = 'votes'
export const VOTING_SESSIONS_TABLE = 'VotingSessions'

// Helper functions
export async function ensureContainersExist(
    blobServiceClient: BlobServiceClient,
    tableServiceClient: TableServiceClient,
): Promise<void> {
    const votingSessionsContainer = blobServiceClient.getContainerClient(VOTING_SESSIONS_CONTAINER)
    const votesContainer = blobServiceClient.getContainerClient(VOTES_CONTAINER)

    await votingSessionsContainer.createIfNotExists({ access: 'blob' })
    await votesContainer.createIfNotExists({ access: 'blob' })

    await tableServiceClient.createTable(VOTING_SESSIONS_TABLE, {
        onResponse: (response) => {
            if (response.status === 409) {
                console.log(`Table ${VOTING_SESSIONS_TABLE} already exists`)
            }
        },
    })
}

export async function createVotingSession(
    blobServiceClient: BlobServiceClient,
    tableServiceClient: TableServiceClient,
    tableClient: TableClient,
    sessionId: string,
    year: string,
    pairs: TalkPair[],
): Promise<void> {
    await ensureContainersExist(blobServiceClient, tableServiceClient)

    // Store pairs in blob storage
    const container = blobServiceClient.getContainerClient(VOTING_SESSIONS_CONTAINER)
    const blobName = `${year}/pairs.json`
    const blockBlobClient = container.getBlockBlobClient(blobName)

    const votingPairs: VotingPairs = {
        sessionId,
        year,
        pairs,
        createdAt: new Date().toISOString(),
    }

    await blockBlobClient.upload(JSON.stringify(votingPairs), Buffer.byteLength(JSON.stringify(votingPairs)))

    // Create votes append blob
    const votesContainer = blobServiceClient.getContainerClient(VOTES_CONTAINER)
    const votesBlobName = `${sessionId}.txt`
    const appendBlobClient = votesContainer.getAppendBlobClient(votesBlobName)

    await appendBlobClient.createIfNotExists()

    // Store session metadata in table storage
    const session: VotingSession = {
        sessionId,
        year,
        status: 'active',
        startTime: new Date().toISOString(),
        totalSessions: pairs.length,
        createdAt: new Date().toISOString(),
    }

    await tableClient.createEntity({
        partitionKey: year,
        rowKey: sessionId,
        ...session,
    })
}

export async function recordVote(
    blobServiceClient: BlobServiceClient,
    sessionId: string,
    vote: 'A' | 'B',
): Promise<number> {
    const container = blobServiceClient.getContainerClient(VOTES_CONTAINER)
    const appendBlobClient = container.getAppendBlobClient(`${sessionId}.txt`)

    // Append vote atomically
    await appendBlobClient.appendBlock(vote, vote.length)

    // Get current vote count
    const properties = await appendBlobClient.getProperties()
    return properties.contentLength || 0
}

export async function getVotingProgress(
    blobServiceClient: BlobServiceClient,
    sessionId: string,
): Promise<{ currentIndex: number; votes: string }> {
    const container = blobServiceClient.getContainerClient(VOTES_CONTAINER)
    const blobClient = container.getBlobClient(`${sessionId}.txt`)

    try {
        const downloadResponse = await blobClient.download()
        if (!downloadResponse.readableStreamBody) {
            recordException(new Error(`Failed to download blob: ${downloadResponse.errorCode}`))
            throw new Error('Failed to download blob')
        }
        const votes = await streamToString(downloadResponse.readableStreamBody)
        return {
            currentIndex: votes.length,
            votes,
        }
    } catch (error: any) {
        if (error.statusCode === 404) {
            return { currentIndex: 0, votes: '' }
        }
        throw error
    }
}

export async function getVotingPairs(blobServiceClient: BlobServiceClient, year: string): Promise<VotingPairs | null> {
    const container = blobServiceClient.getContainerClient(VOTING_SESSIONS_CONTAINER)
    const blobClient = container.getBlobClient(`${year}/pairs.json`)

    try {
        const downloadResponse = await blobClient.download()
        if (!downloadResponse.readableStreamBody) {
            recordException(new Error(`Failed to download blob: ${downloadResponse.errorCode}`))
            throw new Error('Failed to download blob')
        }
        const content = await streamToString(downloadResponse.readableStreamBody)
        return JSON.parse(content)
    } catch (error: any) {
        if (error.statusCode === 404) {
            return null
        }
        throw error
    }
}

export async function getVotingSession(
    tableClient: TableClient,
    year: string,
    sessionId: string,
): Promise<VotingSession | null> {
    try {
        const entity = await tableClient.getEntity(year, sessionId)
        return {
            sessionId: entity.sessionId as string,
            year: entity.year as string,
            status: entity.status as 'pending' | 'active' | 'completed',
            startTime: entity.startTime as string,
            endTime: entity.endTime as string | undefined,
            totalSessions: entity.totalSessions as number,
            createdAt: entity.createdAt as string,
        }
    } catch (error: any) {
        if (error.statusCode === 404) {
            return null
        }
        throw error
    }
}

export async function getActiveVotingSession(tableClient: TableClient, year: Year): Promise<VotingSession | null> {
    try {
        const entities = tableClient.listEntities({
            queryOptions: {
                filter: `PartitionKey eq '${year}' and status eq 'active'`,
            },
        })

        for await (const entity of entities) {
            if (
                typeof entity.sessionId === 'string' &&
                typeof entity.year === 'string' &&
                (entity.status === 'pending' || entity.status === 'active' || entity.status === 'completed') &&
                typeof entity.startTime === 'string' &&
                (typeof entity.endTime === 'string' || entity.endTime === undefined) &&
                typeof entity.createdAt === 'string'
            ) {
                return {
                    sessionId: entity.sessionId,
                    year: entity.year,
                    status: entity.status,
                    startTime: entity.startTime,
                    endTime: entity.endTime ? entity.endTime : undefined,
                    totalSessions: Number(entity.totalSessions) || 0,
                    createdAt: entity.createdAt,
                }
            }
        }

        return null
    } catch (error) {
        recordException(error)
        console.error('Error getting active voting session:', error)
        return null
    }
}

// Utility function to convert stream to string
async function streamToString(readableStream: NodeJS.ReadableStream): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = []
        readableStream.on('data', (data) => {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data))
        })
        readableStream.on('end', () => {
            resolve(Buffer.concat(chunks).toString('utf8'))
        })
        readableStream.on('error', reject)
    })
}

// Generate random pairs of talks
export function generateTalkPairs(sessions: SessionData[]): TalkPair[] {
    const pairs: TalkPair[] = []
    const sessionsCopy = [...sessions]

    // Shuffle array using Fisher-Yates algorithm
    for (let i = sessionsCopy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[sessionsCopy[i], sessionsCopy[j]] = [sessionsCopy[j], sessionsCopy[i]]
    }

    // Create pairs
    for (let i = 0; i < sessionsCopy.length - 1; i += 2) {
        pairs.push({
            index: pairs.length,
            left: sessionsCopy[i],
            right: sessionsCopy[i + 1],
        })
    }

    // If odd number of sessions, create a pair with the last session appearing twice
    if (sessionsCopy.length % 2 !== 0) {
        const lastSession = sessionsCopy[sessionsCopy.length - 1]
        const randomIndex = Math.floor(Math.random() * (sessionsCopy.length - 1))
        pairs.push({
            index: pairs.length,
            left: lastSession,
            right: sessionsCopy[randomIndex],
        })
    }

    return pairs
}

// Calculate vote results
export async function calculateVoteResults(
    blobServiceClient: BlobServiceClient,
    tableClient: TableClient,
    year: string,
    sessionId: string,
): Promise<Map<string, number>> {
    try {
        const [pairs, progress] = await Promise.all([
            getVotingPairs(blobServiceClient, year),
            getVotingProgress(blobServiceClient, sessionId),
        ])

        if (!pairs || !progress) {
            throw new Error('Failed to load voting data')
        }

        const results = new Map<string, number>()

        // Initialize all sessions with 0 votes
        for (const pair of pairs.pairs) {
            if (pair?.left?.id) results.set(pair.left.id, 0)
            if (pair?.right?.id) results.set(pair.right.id, 0)
        }

        // Count votes
        for (let i = 0; i < progress.votes?.length && i < pairs.pairs.length; i++) {
            const vote = progress.votes[i]
            const pair = pairs.pairs[i]

            if (vote === 'A' && pair?.left?.id) {
                results.set(pair.left.id, (results.get(pair.left.id) || 0) + 1)
            } else if (vote === 'B' && pair?.right?.id) {
                results.set(pair.right.id, (results.get(pair.right.id) || 0) + 1)
            }
        }

        return results
    } catch (error) {
        console.error('Error calculating vote results:', error)
        return new Map()
    }
}
