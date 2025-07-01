import { data } from 'react-router'
import { votingStorage } from '~/lib/session.server'
import { ensureVotesTableExists, recordVoteInTable } from '~/lib/voting.server'
import type { VoteSuccessResponse, VoteErrorResponse } from '~/lib/voting-api-types'
import type { Route } from './+types/api.voting.vote'

export async function action({ request, context }: Route.ActionArgs) {
    try {
        if (context.conferenceState.talkVoting.state !== 'open') {
            const errorResponse: VoteErrorResponse = { error: 'Voting is not open' }
            return data(errorResponse, { status: 403 })
        }

        const formData = await request.formData()
        const vote = formData.get('vote') as 'A' | 'B' | 'skip'
        const voteIndexStr = formData.get('voteIndex') as string
        const voteIndex = parseInt(voteIndexStr, 10)

        if (!vote || isNaN(voteIndex)) {
            const errorResponse: VoteErrorResponse = { error: 'Invalid vote data' }
            return data(errorResponse, { status: 400 })
        }

        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')
        
        if (!sessionId) {
            const errorResponse: VoteErrorResponse = { error: 'No voting session' }
            return data(errorResponse, { status: 401 })
        }

        const tableClient = await ensureVotesTableExists(
            context.tableServiceClient,
            context.getTableClient,
            context.conferenceState.conference.year,
        )

        await recordVoteInTable(tableClient, sessionId, voteIndex, vote)
        
        const successResponse: VoteSuccessResponse = { success: true, voteIndex }
        return data(successResponse)
    } catch (error: any) {
        console.error('Failed to record vote:', error)
        
        // Check if it's a duplicate vote (already voted on this index)
        if (error.statusCode === 409) {
            const errorResponse: VoteErrorResponse = { error: 'Already voted on this pair', duplicate: true }
            return data(errorResponse, { status: 409 })
        }
        
        const errorResponse: VoteErrorResponse = { error: 'Failed to record vote' }
        return data(errorResponse, { status: 500 })
    }
}