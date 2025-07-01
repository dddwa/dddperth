import { data, isRouteErrorResponse } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config.server'
import { votingStorage } from '~/lib/session.server'
import {
    ensureVotesTableExists,
    getCurrentVotingBatch,
    getSessionsForVoting,
    getVotingSession,
} from '~/lib/voting.server'
import type { VotingBatchResponse, VotingErrorResponse } from '~/lib/voting-api-types'
import type { Route } from './+types/api.voting.batch'

export async function loader({ request, context }: Route.LoaderArgs) {
    try {
        const yearConfig = getYearConfig(context.conferenceState.conference.year)

        if (yearConfig.kind === 'cancelled') {
            const errorResponse: VotingErrorResponse = { error: 'Conference cancelled this year' }
            return data(errorResponse, { status: 404 })
        }

        if (context.conferenceState.talkVoting.state === 'not-open-yet') {
            const errorResponse: VotingErrorResponse = { error: 'Voting not open yet', state: 'not-open-yet' }
            return data(errorResponse, { status: 403 })
        }

        if (context.conferenceState.talkVoting.state === 'closed') {
            const errorResponse: VotingErrorResponse = { error: 'Voting has closed', state: 'closed' }
            return data(errorResponse, { status: 403 })
        }

        // Check if Sessionize endpoint is configured
        if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
            const errorResponse: VotingErrorResponse = { error: 'Sessionize endpoint not configured' }
            return data(errorResponse, { status: 500 })
        }

        // Get session ID from cookie
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        if (!sessionId) {
            const errorResponse: VotingErrorResponse = { error: 'No voting session', needsSession: true }
            return data(errorResponse, { status: 401 })
        }

        const sessions = await getSessionsForVoting(yearConfig.sessions.allSessionsEndpoint)
        const tableClient = await ensureVotesTableExists(
            context.tableServiceClient,
            context.getTableClient,
            context.conferenceState.conference.year,
        )

        const userSession = await getVotingSession(request, tableClient, sessions)
        
        // Get batch size and starting position from query params
        const url = new URL(request.url)
        const batchSize = Math.min(100, parseInt(url.searchParams.get('size') || '50', 10))
        const fromIndex = parseInt(url.searchParams.get('from') || userSession.currentIndex.toString(), 10)

        const batch = await getCurrentVotingBatch(request, sessions, userSession, batchSize, fromIndex)

        const successResponse: VotingBatchResponse = {
            batch,
            sessionId,
            votingState: context.conferenceState.talkVoting.state,
        }
        return data(successResponse)
    } catch (error) {
        // If this is a Response object (from redirect()), let it pass through
        if (error instanceof Response) {
            throw error
        }
        
        // If this is a route error response (from redirect), let it pass through
        if (isRouteErrorResponse(error) && error.status >= 300 && error.status < 400) {
            throw error
        }
        
        console.error('Error fetching voting batch:', error)
        const errorResponse: VotingErrorResponse = { error: 'Failed to fetch voting batch' }
        return data(errorResponse, { status: 500 })
    }
}
