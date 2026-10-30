import { conferenceManifest } from '@conference/manifest'
import { loadSpeakerSettings } from '~/lib/admin-settings/speakers.server'
import { buildScheduleGrid, type ScheduleGrid } from '~/lib/meet-the-experts-schedule-email'
import type { MeetTheExpertsRegistrantType } from '~/lib/services/meet-the-experts-store'
import { getServices } from '~/remix-app-load-context'

type Context = Parameters<typeof loadSpeakerSettings>[0]

export interface MeetTheExpertsSeat {
    tableId: string
    slotId: string
    displayName: string
    /** Their registration's custom bio, or else their default (Sessionize bio / sponsor blurb). */
    bio?: string
    /** Stable across reseating — see `meetTheExpertsFeedbackId`. */
    feedbackId: string
}

/**
 * The id feedback about a Meet the Experts registrant is stored under. It
 * follows the person, not the seat, so moving them to another table or slot
 * doesn't orphan feedback already given. Hashed because the raw registrant id
 * of a sponsor is its Jira issue key, which has no business on a public page.
 */
export async function meetTheExpertsFeedbackId(type: MeetTheExpertsRegistrantType, id: string): Promise<string> {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key(type, id)))
    const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
    return `mte-${hex.slice(0, 16)}`
}

export type MeetTheExpertsAgenda = ScheduleGrid<MeetTheExpertsSeat>

/**
 * The Meet the Experts seating for the public agenda page — the same grid
 * the admin seating page emails out (slots as rows, tables as columns).
 *
 * Seating isn't stored per year: it belongs to whichever year the speaker
 * portal is collecting for, so it's only returned for that year. Also
 * undefined until someone is actually seated, so the agenda doesn't show an
 * empty grid while slots and tables are still being set up.
 *
 * Only *active* speakers and sponsors are named: someone who has since
 * dropped out shows as an empty seat rather than being advertised publicly.
 * Seats are rebuilt field by field because this goes to a public page — an
 * assignment also carries `assignedBy`, an admin's email.
 */
export async function getMeetTheExpertsAgenda(context: Context, year: string): Promise<MeetTheExpertsAgenda | undefined> {
    if (conferenceManifest.speakerPortal?.year !== year) return undefined

    const services = getServices(context)
    const [{ tables, assignments }, { meetTheExpertsSlots: slots }] = await Promise.all([
        services.meetTheExpertsScheduling.getState(),
        loadSpeakerSettings(context),
    ])
    if (!assignments.length || !tables.length || !slots.length) return undefined

    const sponsorYear = conferenceManifest.sponsorPortal?.year
    const [speakers, sponsors, registrations] = await Promise.all([
        services.speakers.listSpeakers(year),
        sponsorYear && assignments.some((a) => a.registrantType === 'sponsor')
            ? services.sponsors.listSponsors(sponsorYear)
            : Promise.resolve([]),
        services.meetTheExperts.listRegistrations(),
    ])

    // The registrant's own default bio, used unless they wrote a custom one.
    const personByKey = new Map<string, { displayName: string; defaultBio?: string }>()
    for (const speaker of speakers.filter((s) => s.active)) {
        personByKey.set(key('speaker', speaker.sessionizeId), { displayName: speaker.fullName, defaultBio: speaker.bio })
    }
    for (const sponsor of sponsors.filter((s) => s.active)) {
        personByKey.set(key('sponsor', sponsor.issueKey), {
            displayName: sponsor.companyName,
            // Same prefill rule as the portal: the sponsor's saved blurb wins over the committee's Jira quote.
            defaultBio: sponsor.profile?.blurb ?? sponsor.jiraQuote,
        })
    }
    const registrationByKey = new Map(registrations.map((r) => [key(r.registrantType, r.registrantId), r]))
    const feedbackIds = await Promise.all(
        assignments.map((a) => meetTheExpertsFeedbackId(a.registrantType, a.registrantId)),
    )

    return buildScheduleGrid({
        slots,
        tables,
        assignments: assignments.flatMap(({ tableId, slotId, registrantType, registrantId }, i) => {
            const person = personByKey.get(key(registrantType, registrantId))
            if (!person) return []
            const registration = registrationByKey.get(key(registrantType, registrantId))
            const bio = registration?.bioUseDefault === false ? registration.bioCustomText : person.defaultBio
            return [
                {
                    tableId,
                    slotId,
                    displayName: person.displayName,
                    bio: bio?.trim() || undefined,
                    feedbackId: feedbackIds[i],
                },
            ]
        }),
    })
}

const key = (type: MeetTheExpertsRegistrantType, id: string) => `${type}:${id}`
