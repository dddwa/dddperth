import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getConfSessions, getConfSpeakers, getSpeakerUnderrepresentedGroup } from '~/lib/sessionize.server'
import { getUnderrepresentedGroupsConfig, getVoteResults } from '~/lib/voting-validation.server'
import { ensureVotesTableExists } from '~/lib/voting.server'
import type { Route } from './+types/admin.voting-validation.stats.$runId.download'

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const { runId } = params
    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    const yearConfig = getYearConfig(year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }
    const sessionizeConfig = yearConfig.sessions

    // Ensure the votes table exists
    const tableClient = await ensureVotesTableExists(context.tableServiceClient, context.getTableClient, year)

    // Get all vote results for this run
    const voteResults = await getVoteResults(tableClient, runId)

    // Get sessionize data to map talk IDs to speakers
    const sessions = await getConfSessions({
        sessionizeEndpoint: sessionizeConfig.sessionizeEndpoint,
    })

    // Get speakers data
    const speakers = await getConfSpeakers({
        sessionizeEndpoint: sessionizeConfig.sessionizeEndpoint,
    })

    // Get underrepresented groups configuration
    const underrepresentedGroups = await getUnderrepresentedGroupsConfig(tableClient)

    // Create a map of talk ID to speaker IDs
    const talkToSpeakerIds = new Map<string, string[]>()
    sessions.forEach((session) => {
        talkToSpeakerIds.set(
            session.id,
            session.speakers.map((s) => s.id),
        )
    })

    // Create a map of speaker ID to underrepresented status
    const speakerToUnderrepresented = new Map<string, boolean>()
    const underrepresentedGroupQuestionId = sessionizeConfig.underrepresentedGroupsQuestionId

    if (underrepresentedGroupQuestionId) {
        speakers.forEach((speaker) => {
            const group = getSpeakerUnderrepresentedGroup(speaker, underrepresentedGroupQuestionId)
            const isUnderrepresented = group ? underrepresentedGroups.includes(group) : false
            speakerToUnderrepresented.set(speaker.id, isUnderrepresented)
        })
    }

    // Transform to the format expected by the ELO tool with underrepresented info
    type VoteEntryForElo = {
        a: string
        b: string
        vote: 'a' | 'b' | 'skip'
        aUnderrep: boolean
        bUnderrep: boolean
    }

    const votes = voteResults.map((vote): VoteEntryForElo => {
        const aSpeakerIds = talkToSpeakerIds.get(vote.a) || []
        const bSpeakerIds = talkToSpeakerIds.get(vote.b) || []

        // Check if any speaker in talk A is underrepresented
        const aUnderrep = aSpeakerIds.some((id) => speakerToUnderrepresented.get(id) || false)
        // Check if any speaker in talk B is underrepresented
        const bUnderrep = bSpeakerIds.some((id) => speakerToUnderrepresented.get(id) || false)

        return {
            a: vote.a,
            b: vote.b,
            vote: vote.vote,
            aUnderrep,
            bUnderrep,
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