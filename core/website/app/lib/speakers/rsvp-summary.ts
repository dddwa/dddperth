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
