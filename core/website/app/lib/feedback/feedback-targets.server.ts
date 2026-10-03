import { conferenceManifest } from '@conference/manifest'
import { DateTime } from 'luxon'
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
 * Meet the Experts doesn't take feedback, so `public` leaves it out; the
 * admin views read the organisers' copy, with every talk and Meet the Experts
 * seat, so feedback stored before that change still has a name in reports.
 */
export async function getFeedbackTargets(
    context: Context,
    year: Year,
    audience: 'public' | 'organisers',
): Promise<FeedbackTarget[]> {
    if (audience === 'public') return (await getPublicFeedbackTargets(context, year)).targets

    const schedule = await getScheduleForOrganisers(context, year)
    if (!schedule) return []
    const meetTheExperts = await getMeetTheExpertsAgenda(context, year)
    return buildFeedbackTargets(scheduleTalks(schedule), meetTheExperts, conferenceManifest.public.timezone)
}

/** A published talk that can't take feedback yet because it hasn't finished. */
export interface UpcomingFeedbackTalk {
    id: string
    title: string
    /** `h:mm am`. */
    endsAt: string
}

/**
 * The public feedback targets, plus `upcomingTalkId`'s talk if it's on the
 * agenda but not over yet, from one schedule fetch. That talk is how the form
 * explains itself to someone who followed a link to it early (a QR code on
 * the room door, say) instead of quietly showing an empty picker.
 */
export async function getPublicFeedbackTargets(
    context: Context,
    year: Year,
    upcomingTalkId?: string | null,
): Promise<{ targets: FeedbackTarget[]; upcomingTalk: UpcomingFeedbackTalk | undefined }> {
    const schedule = await getPublishedSchedule(context, year)
    if (!schedule) return { targets: [], upcomingTalk: undefined }

    const { timezone } = conferenceManifest.public
    const now = getDateTimeProvider(context).now()
    const [ended, upcoming] = partition(scheduleTalks(schedule), (talk) => hasTalkEnded(talk.endsAt, now, timezone))

    const upcomingTalk = upcomingTalkId ? upcoming.find((talk) => talk.id === upcomingTalkId) : undefined
    return {
        targets: buildFeedbackTargets(ended, undefined, timezone),
        // An upcoming talk always has an end time: one without counts as ended.
        upcomingTalk: upcomingTalk?.endsAt
            ? {
                  id: upcomingTalk.id,
                  title: upcomingTalk.title,
                  endsAt: DateTime.fromISO(upcomingTalk.endsAt, { zone: timezone }).toFormat('h:mm a').toLowerCase(),
              }
            : undefined,
    }
}

function partition<T>(items: T[], predicate: (item: T) => boolean): [T[], T[]] {
    const yes: T[] = []
    const no: T[] = []
    for (const item of items) (predicate(item) ? yes : no).push(item)
    return [yes, no]
}
