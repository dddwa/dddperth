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

/** A session's status + Sessionize confirmation flag — just enough for the
 * confirm-session checklist rule. */
export interface SessionConfirmationInput {
    status: string
    isConfirmed: boolean
}

/** Done once every Accepted session is confirmed in Sessionize (synced), or
 * the speaker self-reports via the checklist button. A speaker with no
 * Accepted sessions yet (e.g. still Waitlisted) has nothing to confirm. */
export function isSessionConfirmed(profile: SpeakerProfile | null, sessions: SessionConfirmationInput[]): boolean {
    if (profile?.sessionConfirmedReportedAt) return true
    const accepted = sessions.filter((s) => s.status === 'Accepted')
    return accepted.length > 0 && accepted.every((s) => s.isConfirmed)
}

export interface SpeakerChecklistItem {
    key: 'confirmSession' | 'sessionDetails' | 'claimTicket' | 'speakerTraining'
    label: string
    done: boolean
    /** ISO 8601 — loaders can't hand DateTime instances across the wire. */
    dueDateIso?: string
}

export interface SpeakerChecklistDueDates {
    confirmSession?: DateTime
    sessionDetails?: DateTime
    ticketClaim?: DateTime
    speakerTraining?: DateTime
}

export function speakerChecklist(
    profile: SpeakerProfile | null,
    sessions: SessionConfirmationInput[],
    dueDates: SpeakerChecklistDueDates = {},
): SpeakerChecklistItem[] {
    return [
        {
            key: 'confirmSession',
            label: 'Confirm your session in Sessionize',
            done: isSessionConfirmed(profile, sessions),
            dueDateIso: dueDates.confirmSession?.toISO() ?? undefined,
        },
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
