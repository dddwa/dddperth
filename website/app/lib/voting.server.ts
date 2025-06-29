import type { TableClient, TableServiceClient } from '@azure/data-tables'
import type { BlobServiceClient } from '@azure/storage-blob'
import {
    createVotingSession,
    generateTalkPairs,
    getActiveVotingSession,
    getVotingPairs,
    type SessionData,
} from './azure-storage.server'
import type { ConferenceState, Year } from './conference-state-client-safe'
import type { ConferenceYear } from './config-types.server'
import { getConfSessions } from './sessionize.server'

export async function initializeVoting(
    blobServiceClient: BlobServiceClient,
    tableServiceClient: TableServiceClient,
    tableClient: TableClient,
    yearConfig: ConferenceYear,
    conferenceState: ConferenceState,
): Promise<string> {
    const sessions = yearConfig.sessions
    if (!sessions || sessions.kind !== 'sessionize') {
        throw new Error('No Sessionize URL configured for this year')
    }
    if (!sessions.allSessionsEndpoint) {
        throw new Error(
            'No Sessionize all sessions endpoint configured for this year. Please ensure all sessions endpoint environmental variable is set for the current year.',
        )
    }
    if (conferenceState.talkVoting.state !== 'open') {
        throw new Error('Voting is not currently open')
    }

    // Check if there's already an active session
    const existingSession = await getActiveVotingSession(tableClient, yearConfig.year)
    if (existingSession) {
        return existingSession.sessionId
    }

    // Get sessions from Sessionize
    const sessionGroups = await getConfSessions({
        sessionizeEndpoint: sessions.allSessionsEndpoint,
        confTimeZone: 'Australia/Perth',
        noCache: true,
    })

    // Filter out service sessions and extract regular sessions
    const regularSessions: SessionData[] = []
    for (const group of sessionGroups) {
        for (const session of group.sessions) {
            if (!session.isServiceSession && !session.isPlenumSession) {
                regularSessions.push({
                    id: session.id,
                    title: session.title,
                    description: session.description,
                    speakers: session.speakers,
                    categories: session.categories,
                })
            }
        }
    }

    if (regularSessions.length === 0) {
        throw new Error('No sessions available for voting')
    }

    // Generate pairs
    const pairs = generateTalkPairs(regularSessions)

    // Create new voting session
    const sessionId = `voting-${yearConfig.year}-${Date.now()}`
    await createVotingSession(blobServiceClient, tableServiceClient, tableClient, sessionId, yearConfig.year, pairs)

    return sessionId
}

export async function getVotingSessions(blobServiceClient: BlobServiceClient, year: Year) {
    const pairs = await getVotingPairs(blobServiceClient, year)
    if (!pairs) {
        return null
    }

    // Extract unique sessions from pairs
    const sessionsMap = new Map<string, SessionData>()

    pairs.pairs.forEach((pair) => {
        sessionsMap.set(pair.left.id, pair.left)
        sessionsMap.set(pair.right.id, pair.right)
    })

    return {
        sessions: Array.from(sessionsMap.values()),
        totalPairs: pairs.pairs.length,
    }
}
