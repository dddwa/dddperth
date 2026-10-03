import { conferenceManifest } from '@conference/manifest'
import type { Year } from '~/lib/conference-state-client-safe'
import { getMeetTheExpertsAgenda } from '~/lib/meet-the-experts-agenda.server'
import { getPublishedSchedule, getScheduleForOrganisers, scheduleTalks } from '~/lib/published-agenda.server'
import { buildFeedbackTargets, type FeedbackTarget } from './feedback-targets'

type Context = Parameters<typeof getPublishedSchedule>[0] & Parameters<typeof getMeetTheExpertsAgenda>[0]

/**
 * Everything on `year`'s agenda that can take session feedback. `public`
 * applies the agenda's publication gate, so the feedback form can't list a
 * talk before it's announced; the admin views read the organisers' copy.
 */
export async function getFeedbackTargets(
    context: Context,
    year: Year,
    audience: 'public' | 'organisers',
): Promise<FeedbackTarget[]> {
    const schedule =
        audience === 'public' ? await getPublishedSchedule(context, year) : await getScheduleForOrganisers(context, year)
    if (!schedule) return []

    const meetTheExperts = await getMeetTheExpertsAgenda(context, year)
    return buildFeedbackTargets(scheduleTalks(schedule), meetTheExperts, conferenceManifest.public.timezone)
}
