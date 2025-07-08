import { trace } from '@opentelemetry/api'
import { data, redirect } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config.server'
import { votingStorage } from '~/lib/session.server'
import type { VoteErrorResponse, VoteSuccessResponse } from '~/lib/voting-api-types'
import { CURRENT_CLIENT_VERSION } from '~/lib/voting-version-constants'
import { ensureVotesTableExists, recordVoteInTable } from '~/lib/voting.server'
import type { Route } from './+types/api.voting.vote'

export async function action({ request, context }: Route.ActionArgs) {
    try {
        if (context.conferenceState.talkVoting.state !== 'open') {
            const errorResponse: VoteErrorResponse = { error: 'Voting is not open' }
            return data(errorResponse, { status: 403 })
        }

        const formData = await request.formData()

        // Safely extract and validate form data
        const voteRaw = formData.get('vote')
        const clientVersionRaw = formData.get('clientVersion')
        const roundNumberRaw = formData.get('roundNumber')
        const indexInRoundRaw = formData.get('indexInRound')

        // Check for client version first - missing version indicates old client
        const expectedClientVersion = CURRENT_CLIENT_VERSION
        if (!clientVersionRaw || clientVersionRaw !== expectedClientVersion) {
            // Old client detected (no version field) - redirect to reload page
            throw redirect('/voting')
        }

        // Validate other required fields exist
        if (!voteRaw || !roundNumberRaw || !indexInRoundRaw) {
            const errorResponse: VoteErrorResponse = {
                error: 'Missing required fields, try hard refreshing the page, this should not happen',
            }
            return data(errorResponse, { status: 400 })
        }

        // Validate types and values - FormDataEntryValue can be string or File
        if (typeof voteRaw !== 'string' || typeof roundNumberRaw !== 'string' || typeof indexInRoundRaw !== 'string') {
            trace.getActiveSpan()?.addEvent('Invalid field types', {
                voteRaw: JSON.stringify(voteRaw),
                roundNumberRaw: JSON.stringify(roundNumberRaw),
                indexInRoundRaw: JSON.stringify(indexInRoundRaw),
            })

            const errorResponse: VoteErrorResponse = { error: 'Invalid field types' }
            return data(errorResponse, { status: 400 })
        }

        const vote = voteRaw
        const roundNumberStr = roundNumberRaw
        const indexInRoundStr = indexInRoundRaw

        // Validate vote value
        if (vote !== 'A' && vote !== 'B' && vote !== 'skip') {
            const errorResponse: VoteErrorResponse = { error: 'Invalid vote value' }
            return data(errorResponse, { status: 400 })
        }

        // Parse and validate round number
        const roundNumber = parseInt(roundNumberStr, 10)
        if (isNaN(roundNumber) || roundNumber < 0) {
            const errorResponse: VoteErrorResponse = { error: 'Invalid round number' }
            return data(errorResponse, { status: 400 })
        }

        // Parse and validate index
        const indexInRound = parseInt(indexInRoundStr, 10)
        if (isNaN(indexInRound) || indexInRound < 0) {
            const errorResponse: VoteErrorResponse = { error: 'Invalid index value' }
            return data(errorResponse, { status: 400 })
        }

        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        const sessionId = votingStorageSession.get('sessionId')

        if (!sessionId) {
            const errorResponse: VoteErrorResponse = { error: 'No voting session' }
            return data(errorResponse, { status: 401 })
        }

        const yearConfig = getYearConfig(context.conferenceState.conference.year)
        if (
            yearConfig.kind === 'cancelled' ||
            yearConfig.sessions?.kind !== 'sessionize' ||
            !yearConfig.sessions.allSessionsEndpoint
        ) {
            const errorResponse: VoteErrorResponse = { error: 'Voting configuration invalid' }
            return data(errorResponse, { status: 404 })
        }

        const tableClient = await ensureVotesTableExists(
            context.tableServiceClient,
            context.getTableClient,
            context.conferenceState.conference.year,
        )

        await recordVoteInTable(tableClient, sessionId, roundNumber, indexInRound, vote)

        const successResponse: VoteSuccessResponse = { success: true, indexInRound }
        return data(successResponse)
    } catch (error: any) {
        if (error instanceof Response) {
            throw error
        }
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
