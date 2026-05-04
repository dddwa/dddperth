import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import type { Route } from './+types/admin.voting-validation.stats.$runId.download'

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    const { runId } = params
    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    const yearConfig = getYearConfig(year, context.config)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const voteResults = await context.services.voting.getVoteResults(runId)

    // Transform to the format expected by the ELO tool with underrepresented info
    type VoteEntryForElo = {
        a: string
        b: string
        vote: 'a' | 'b' | 'skip'
    }

    const votes = voteResults.map((vote): VoteEntryForElo => {
        return {
            a: vote.a,
            b: vote.b,
            vote: vote.vote,
        }
    })

    // Return JSON file for download
    return new Response(JSON.stringify(votes, null, 2), {
        headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="votes_run_${runId}.json"`,
        },
    })
}
