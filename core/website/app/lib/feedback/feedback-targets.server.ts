import { conferenceManifest } from '@conference/manifest'
import type { Year } from '~/lib/conference-state-client-safe'
import { getMeetTheExpertsAgenda } from '~/lib/meet-the-experts-agenda.server'
import { getPublishedSchedule, getScheduleForOrganisers, scheduleTalks } from '~/lib/published-agenda.server'
import { getDateTimeProvider } from '~/remix-app-load-context'
import { buildFeedbackTargets, type FeedbackTarget } from './feedback-targets'
import { hasTalkEnded } from './talk-ended'

type Context = Parameters<typeof getPublishedSchedule>[0] & Parameters<typeof getMeetTheExpertsAgenda>[0]

/**
 * Everything on `year`'s agenda that can take session feedback. `public`
 * applies the agenda's publication gate, so the feedback form can't list a
 * talk before it's announced, and leaves out talks that haven't finished yet.
 * The form's action checks submissions against this same list, so that's
 * what stops feedback on a talk that's still to come, not the hidden links.
 * The admin views read the organisers' copy, with every talk.
 */
export async function getFeedbackTargets(
    context: Context,
    year: Year,
    audience: 'public' | 'organisers',
): Promise<FeedbackTarget[]> {
    const schedule =
        audience === 'public'
            ? await getPublishedSchedule(context, year)
            : await getScheduleForOrganisers(context, year)
    if (!schedule) return []

    const { timezone } = conferenceManifest.public
    const talks = scheduleTalks(schedule)
    const now = getDateTimeProvider(context).now()
    const offered = audience === 'public' ? talks.filter((talk) => hasTalkEnded(talk.endsAt, now, timezone)) : talks

    const meetTheExperts = await getMeetTheExpertsAgenda(context, year)
    return buildFeedbackTargets(offered, meetTheExperts, timezone)
}
