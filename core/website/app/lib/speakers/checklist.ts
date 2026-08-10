import type { DateTime } from 'luxon'
import type { SpeakerProfile } from '../services/speakers-store'

/**
 * Pure checklist rules for the speaker dashboard's "outstanding items" card.
 * No platform imports — unit-testable in node. Mirrors lib/sponsors/profile.ts.
 */

/** Session details = the core Q&A/introduction fields from the "extra info
 * for organisers" form. Doesn't require every optional field (dietary
 * requirements, "anything else", etc) — just enough that the organisers
 * aren't missing the essentials. */
export function isSessionDetailsComplete(profile: SpeakerProfile | null): boolean {
    if (!profile) return false
    const introductionReady = profile.introductionUseSessionizeBio || Boolean(profile.introductionCustomText)
    return Boolean(profile.questionsPreference) && introductionReady
}

export function isSpeakerTrainingRsvpComplete(profile: SpeakerProfile | null): boolean {
    return (profile?.rsvpSpeakerTraining.length ?? 0) > 0
}

export function isTicketClaimed(profile: SpeakerProfile | null): boolean {
    return Boolean(profile?.ticketClaimedAt)
}

export interface SpeakerChecklistItem {
    key: 'sessionDetails' | 'claimTicket' | 'speakerTraining'
    label: string
    done: boolean
    /** ISO 8601 — loaders can't hand DateTime instances across the wire. */
    dueDateIso?: string
}

export interface SpeakerChecklistDueDates {
    sessionDetails?: DateTime
    ticketClaim?: DateTime
    speakerTraining?: DateTime
}

export function speakerChecklist(
    profile: SpeakerProfile | null,
    dueDates: SpeakerChecklistDueDates = {},
): SpeakerChecklistItem[] {
    return [
        {
            key: 'sessionDetails',
            label: 'Fill in your session details',
            done: isSessionDetailsComplete(profile),
            dueDateIso: dueDates.sessionDetails?.toISO() ?? undefined,
        },
        {
            key: 'claimTicket',
            label: 'Claim your speaker ticket',
            done: isTicketClaimed(profile),
            dueDateIso: dueDates.ticketClaim?.toISO() ?? undefined,
        },
        {
            key: 'speakerTraining',
            label: 'RSVP for speaker training',
            done: isSpeakerTrainingRsvpComplete(profile),
            dueDateIso: dueDates.speakerTraining?.toISO() ?? undefined,
        },
    ]
}
