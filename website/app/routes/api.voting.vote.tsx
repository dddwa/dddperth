import { data } from 'react-router'
import { votingStorage } from '~/lib/session.server'
import { ensureVotesTableExists, recordVoteInTable } from '~/lib/voting.server'
import type { Route } from './+types/api.voting.vote'

export async function action({ request, context }: Route.ActionArgs) {
    try {
        if (context.conferenceState.talkVoting.state !== 'open') {
            return data({ error: 'Voting is not open' }, { status: 403 })
        }

        const formData = await request.formData()
        const vote = formData.get('vote') as 'A' | 'B' | 'skip'
        const voteIndexStr = formData.get('voteIndex') as string
        const voteIndex = parseInt(voteIndexStr, 10)

        if (!vote || isNaN(voteIndex)) {
            return data({ error: 'Invalid vote data' }, { status: 400 })
        }

        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')
        
        if (!sessionId) {
            return data({ error: 'No voting session' }, { status: 401 })
        }

        const tableClient = await ensureVotesTableExists(
            context.tableServiceClient,
            context.getTableClient,
            context.conferenceState.conference.year,
        )

        await recordVoteInTable(tableClient, sessionId, voteIndex, vote)
        
        return data({ success: true, voteIndex })
    } catch (error: any) {
        console.error('Failed to record vote:', error)
        
        // Check if it's a duplicate vote (already voted on this index)
        if (error.statusCode === 409) {
            return data({ error: 'Already voted on this pair', duplicate: true }, { status: 409 })
        }
        
        return data({ error: 'Failed to record vote' }, { status: 500 })
    }
}