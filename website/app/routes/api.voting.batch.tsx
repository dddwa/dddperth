import { data } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config.server'
import { votingStorage } from '~/lib/session.server'
import {
    ensureVotesTableExists,
    getCurrentVotingBatch,
    getSessionsForVoting,
    getVotingSession,
} from '~/lib/voting.server'
import type { Route } from './+types/api.voting.batch'

export async function loader({ request, context }: Route.LoaderArgs) {
    try {
        const yearConfig = getYearConfig(context.conferenceState.conference.year)

        if (yearConfig.kind === 'cancelled') {
            return data({ error: 'Conference cancelled this year' }, { status: 404 })
        }

        if (context.conferenceState.talkVoting.state === 'not-open-yet') {
            return data({ error: 'Voting not open yet', state: 'not-open-yet' }, { status: 403 })
        }

        if (context.conferenceState.talkVoting.state === 'closed') {
            return data({ error: 'Voting has closed', state: 'closed' }, { status: 403 })
        }

        // Check if Sessionize endpoint is configured
        if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
            return data({ error: 'Sessionize endpoint not configured' }, { status: 500 })
        }

        // Get session ID from cookie
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        if (!sessionId) {
            return data({ error: 'No voting session', needsSession: true }, { status: 401 })
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

        return data({
            batch,
            sessionId,
            votingState: context.conferenceState.talkVoting.state,
        })
    } catch (error) {
        console.error('Error fetching voting batch:', error)
        return data({ error: 'Failed to fetch voting batch' }, { status: 500 })
    }
}
