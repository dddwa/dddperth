import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getVoteResults } from '~/lib/voting-validation.server'
import type { Route } from './+types/admin.voting-validation.stats.$runId.download'

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const { runId } = params
    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    const yearConfig = getYearConfig(year, context.cloudflare.env)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const db = context.db

    // Get all vote results for this run
    const voteResults = await getVoteResults(db, runId)

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
