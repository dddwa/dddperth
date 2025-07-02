import { data, isRouteErrorResponse, redirect } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config.server'
import { votingStorage } from '~/lib/session.server'
import type { VotingBatchResponse, VotingErrorResponse } from '~/lib/voting-api-types'
import {
    ensureVotesTableExists,
    extractSessionIds,
    getSessionsForVoting,
    getVotingBatchExplicit,
    getVotingSession,
    hasSessionsChanged,
} from '~/lib/voting.server'
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

        const allSessionsEndpoint = yearConfig.sessions.allSessionsEndpoint
        // We need the sessions for this route either way, if the session needs to be reset, then we need a new session
        // which needs it, and then we redirect, or we need the sessions to generate the batch
        const sessions = await getSessionsForVoting(allSessionsEndpoint)
        const tableClient = await ensureVotesTableExists(
            context.tableServiceClient,
            context.getTableClient,
            context.conferenceState.conference.year,
        )

        const userSession = await getVotingSession(request, tableClient, () => Promise.resolve(sessions))

        // Check for client version compatibility
        const url = new URL(request.url)
        const clientVersion = url.searchParams.get('clientVersion')
        const expectedClientVersion = 'v3'

        if (clientVersion !== expectedClientVersion) {
            // Old client detected - redirect to reload page
            throw redirect('/voting')
        }

        // Check if this is an old v1 or v2 session - if so, reset it to v3
        if (userSession.version !== 3) {
            console.warn('Session uses old algorithm, resetting to v3 due to algorithm change')
            const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
            votingStorageSession.set('sessionId', undefined)

            throw redirect('/voting', {
                headers: {
                    'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
                },
            })
        }

        // Get batch size and starting position from query params
        const batchSize = Math.min(100, parseInt(url.searchParams.get('size') || '50', 10))

        // Check if sessions have changed
        const currentSessionIds = extractSessionIds(sessions)
        if (hasSessionsChanged(currentSessionIds, JSON.parse(userSession.inputSessionizeTalkIdsJson))) {
            console.warn('Sessions have changed since voting started, clearing session and redirecting')
            const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
            votingStorageSession.set('sessionId', undefined)

            throw redirect('/voting', {
                headers: {
                    'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
                },
            })
        }

        // Require explicit round and index parameters
        const fromRoundRaw = url.searchParams.get('fromRound')
        const fromIndexRaw = url.searchParams.get('fromIndex')

        if (!fromRoundRaw || !fromIndexRaw) {
            const errorResponse: VotingErrorResponse = {
                error: 'Missing required fromRound and fromIndex parameters',
            }
            return data(errorResponse, { status: 400 })
        }

        const fromRoundNumber = parseInt(fromRoundRaw, 10)
        const fromIndexInRound = parseInt(fromIndexRaw, 10)

        if (isNaN(fromRoundNumber) || isNaN(fromIndexInRound) || fromRoundNumber < 0 || fromIndexInRound < 0) {
            const errorResponse: VotingErrorResponse = {
                error: 'Invalid fromRound or fromIndex parameters',
            }
            return data(errorResponse, { status: 400 })
        }

        // Use explicit batch function to get pairs starting from the requested position
        const batch = await getVotingBatchExplicit(sessions, userSession, fromRoundNumber, fromIndexInRound, batchSize)

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
