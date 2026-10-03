import { data } from 'react-router'
import { readFeedbackBrowserId } from '~/lib/feedback/feedback-cookie.server'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import type { Route } from './+types/api.feedback.reviewed'

/**
 * The talks this browser has already given feedback on, for the agenda's
 * "Feedback submitted" labels. A separate, uncached request because the agenda
 * page itself is cached and shared: baking one browser's answers into it would
 * show them to whoever got the cached copy next.
 */
export async function loader({ request, context }: Route.LoaderArgs) {
    const state = getConferenceState(context)
    const browserId = readFeedbackBrowserId(request)
    const ids =
        state.feedback === 'open' && browserId
            ? await getServices(context).feedback.listTalkFeedbackTargetIds(state.conference.year, browserId)
            : []
    return data({ ids }, { headers: { 'Cache-Control': 'private, no-store' } })
}
