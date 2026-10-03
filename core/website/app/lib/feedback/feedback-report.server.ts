import { conferenceManifest } from '@conference/manifest'
import type { Year } from '~/lib/conference-state-client-safe'
import { isConferenceYear } from '~/lib/get-year-config.server'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import { buildFeedbackReport, type FeedbackReport } from './feedback-report'
import { getFeedbackTargets } from './feedback-targets.server'

type Context = Parameters<typeof getFeedbackTargets>[0] & Parameters<typeof getConferenceState>[0]

/** `?year=` if it names a conference, else the current one. Unknown years 404. */
export function resolveFeedbackYear(context: Context, requested: string | null): Year {
    if (requested === null) return getConferenceState(context).conference.year
    if (!isConferenceYear(requested)) throw new Response('Unknown conference year', { status: 404 })
    return requested
}

export async function loadFeedbackReport(context: Context, year: Year): Promise<FeedbackReport> {
    const services = getServices(context)
    const [targets, conference, talks] = await Promise.all([
        getFeedbackTargets(context, year, 'organisers'),
        services.feedback.listConferenceFeedback(year),
        services.feedback.listTalkFeedback(year),
    ])
    return buildFeedbackReport(targets, conference, talks)
}

export function feedbackYears(): Year[] {
    return Object.values(conferenceManifest.conferences.conferences)
        .filter((conference) => conference.kind === 'conference')
        .map((conference) => conference.year)
        .sort()
        .reverse()
}
