import type { SpeakerProfile } from '../services/speakers-store'

/**
 * Aggregate RSVP headcount for the admin speakers list — how many active
 * speakers have committed to each training session and to the dinner, split
 * out from those who've explicitly said "not attending" (a completed RSVP
 * with zero sessions / a "No" response) and those who haven't responded at
 * all yet. Pure so it's unit-testable without a store.
 */

export interface TrainingSessionRsvpInfo {
    id: string
    title: string
}

export interface TrainingSessionHeadcount extends TrainingSessionRsvpInfo {
    attendingCount: number
}

export interface RsvpHeadcount {
    totalSpeakers: number
    training: {
        sessions: TrainingSessionHeadcount[]
        /** Responded, but selected zero sessions — a deliberate "not attending any". */
        notAttendingAnyCount: number
        respondedCount: number
        notRespondedCount: number
    }
    dinner: {
        yesCount: number
        noCount: number
        maybeCount: number
        respondedCount: number
        notRespondedCount: number
    }
}

export function buildRsvpHeadcount(
    profiles: Array<SpeakerProfile | null>,
    trainingSessions: TrainingSessionRsvpInfo[],
): RsvpHeadcount {
    const totalSpeakers = profiles.length

    const sessions = trainingSessions.map((session) => ({
        ...session,
        attendingCount: profiles.filter((p) => (p?.rsvpSpeakerTraining as string[] | undefined)?.includes(session.id))
            .length,
    }))

    const trainingResponded = profiles.filter((p) => p?.rsvpSpeakerTrainingRespondedAt)
    const notAttendingAnyCount = trainingResponded.filter((p) => p?.rsvpSpeakerTraining.length === 0).length

    const yesCount = profiles.filter((p) => p?.rsvpSpeakersDinner === 'Yes').length
    const noCount = profiles.filter((p) => p?.rsvpSpeakersDinner === 'No').length
    const maybeCount = profiles.filter((p) => p?.rsvpSpeakersDinner === 'Maybe').length
    const dinnerResponded = yesCount + noCount + maybeCount

    return {
        totalSpeakers,
        training: {
            sessions,
            notAttendingAnyCount,
            respondedCount: trainingResponded.length,
            notRespondedCount: totalSpeakers - trainingResponded.length,
        },
        dinner: {
            yesCount,
            noCount,
            maybeCount,
            respondedCount: dinnerResponded,
            notRespondedCount: totalSpeakers - dinnerResponded,
        },
    }
}

/** Someone in an RSVP group, with every contact email on file for them — a
 * speaker can have more than one, and all of them get the manual email. */
export interface RsvpListPerson {
    sessionizeId: string
    fullName: string
    emails: string[]
    /** Dinner groups only — shown so the list doubles as the catering count. */
    dietaryRequirements?: string
}

export interface RsvpListGroup {
    label: string
    people: RsvpListPerson[]
}

export interface RsvpLists {
    training: RsvpListGroup[]
    dinner: RsvpListGroup[]
}

/**
 * The people behind each tile of `buildRsvpHeadcount` — same groups, same
 * membership rules, so a list's length always matches the count above it.
 * Kept separate from the headcount so the counts stay cheap to render on
 * every load while the lists only matter when an admin opens one.
 */
export function buildRsvpLists(
    speakers: Array<{ sessionizeId: string; fullName: string; contacts: string[]; profile: SpeakerProfile | null }>,
    trainingSessions: TrainingSessionRsvpInfo[],
): RsvpLists {
    const sorted = [...speakers].sort((a, b) => a.fullName.localeCompare(b.fullName))
    const person = (s: (typeof sorted)[number], withDietary = false): RsvpListPerson => ({
        sessionizeId: s.sessionizeId,
        fullName: s.fullName,
        emails: s.contacts,
        ...(withDietary && s.profile?.dietaryRequirements
            ? { dietaryRequirements: s.profile.dietaryRequirements }
            : {}),
    })
    const group = (label: string, match: (p: SpeakerProfile | null) => boolean, withDietary = false) => ({
        label,
        people: sorted.filter((s) => match(s.profile)).map((s) => person(s, withDietary)),
    })

    return {
        training: [
            ...trainingSessions.map((session) =>
                group(
                    session.title,
                    (p) => (p?.rsvpSpeakerTraining as string[] | undefined)?.includes(session.id) ?? false,
                ),
            ),
            group(
                'Not attending any',
                (p) => Boolean(p?.rsvpSpeakerTrainingRespondedAt) && p?.rsvpSpeakerTraining.length === 0,
            ),
            group('Not yet responded', (p) => !p?.rsvpSpeakerTrainingRespondedAt),
        ],
        dinner: [
            group('Yes', (p) => p?.rsvpSpeakersDinner === 'Yes', true),
            group('Maybe', (p) => p?.rsvpSpeakersDinner === 'Maybe', true),
            group('Not attending', (p) => p?.rsvpSpeakersDinner === 'No'),
            group('Not yet responded', (p) => !p?.rsvpSpeakersDinner),
        ],
    }
}
