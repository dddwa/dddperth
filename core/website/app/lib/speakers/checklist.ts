import { DateTime } from 'luxon'
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

/** Done once the training RSVP modal has been submitted at all — an empty
 * session selection ("not attending any") is a valid, deliberate answer, so
 * completion can't be inferred from the selection length alone. */
export function isSpeakerTrainingRsvpComplete(profile: SpeakerProfile | null): boolean {
    return Boolean(profile?.rsvpSpeakerTrainingRespondedAt)
}

export function isSpeakerDinnerRsvpComplete(profile: SpeakerProfile | null): boolean {
    return Boolean(profile?.rsvpSpeakersDinner)
}

export function isTicketClaimed(profile: SpeakerProfile | null): boolean {
    return Boolean(profile?.ticketClaimedAt)
}

export type ChecklistUrgency = 'normal' | 'upcoming' | 'overdue'

/** `overdue` (red) when done items are ignored and the due date is within a
 * day or already past; `upcoming` (orange) when within a week; `normal`
 * otherwise or when there's no due date. */
function urgencyFor(dueDateIso: string | undefined, done: boolean, now: DateTime): ChecklistUrgency {
    if (done || !dueDateIso) return 'normal'
    const due = DateTime.fromISO(dueDateIso)
    if (due <= now.plus({ days: 1 })) return 'overdue'
    if (due <= now.plus({ days: 7 })) return 'upcoming'
    return 'normal'
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
    key: 'confirmSession' | 'sessionDetails' | 'claimTicket' | 'speakerTraining' | 'speakerDinner'
    label: string
    done: boolean
    /** ISO 8601 — loaders can't hand DateTime instances across the wire. */
    dueDateIso?: string
    urgency: ChecklistUrgency
}

export interface SpeakerChecklistDueDates {
    confirmSession?: DateTime
    sessionDetails?: DateTime
    ticketClaim?: DateTime
    speakerTraining?: DateTime
    speakerDinner?: DateTime
}

export function speakerChecklist(
    profile: SpeakerProfile | null,
    sessions: SessionConfirmationInput[],
    dueDates: SpeakerChecklistDueDates = {},
    now: DateTime = DateTime.now(),
): SpeakerChecklistItem[] {
    const item = (
        key: SpeakerChecklistItem['key'],
        label: string,
        done: boolean,
        dueDate: DateTime | undefined,
    ): SpeakerChecklistItem => {
        const dueDateIso = dueDate?.toISO() ?? undefined
        return { key, label, done, dueDateIso, urgency: urgencyFor(dueDateIso, done, now) }
    }

    return [
        item('confirmSession', 'Confirm your session in Sessionize', isSessionConfirmed(profile, sessions), dueDates.confirmSession),
        item('sessionDetails', 'Fill in your session details', isSessionDetailsComplete(profile), dueDates.sessionDetails),
        item('claimTicket', 'Claim your speaker ticket', isTicketClaimed(profile), dueDates.ticketClaim),
        item(
            'speakerTraining',
            'RSVP for speaker training',
            isSpeakerTrainingRsvpComplete(profile),
            dueDates.speakerTraining,
        ),
        item('speakerDinner', 'RSVP for the speaker dinner', isSpeakerDinnerRsvpComplete(profile), dueDates.speakerDinner),
    ]
}

/** Structurally matches `SpeakerTrainingSessionConfig` from
 * @ddd/conference-config — not imported directly to keep this file
 * dependency-free and easy to unit test. */
export interface SpeakerTrainingSessionInfo {
    id: string
    title: string
    dateTime: DateTime
    endDateTime: DateTime
}

export interface SpeakerDinnerInfo {
    dateTime: DateTime
    endDateTime: DateTime
    location?: string
}

export interface UpcomingRsvpedEvent {
    label: string
    dateTime: DateTime
    endDateTime: DateTime
    location?: string
}

/** RSVP'd events (selected training sessions, or the dinner if RSVP is Yes
 * or Maybe) landing within the next 7 days and not yet past — feeds the
 * "coming up" reminder banner. */
export function upcomingRsvpedEvents(
    profile: SpeakerProfile | null,
    config: { speakerTrainingSessions?: SpeakerTrainingSessionInfo[]; speakerDinner?: SpeakerDinnerInfo },
    now: DateTime = DateTime.now(),
): UpcomingRsvpedEvent[] {
    if (!profile) return []

    const events: UpcomingRsvpedEvent[] = []

    for (const sessionId of profile.rsvpSpeakerTraining) {
        const session = config.speakerTrainingSessions?.find((s) => s.id === sessionId)
        if (session) {
            events.push({
                label: `Speaker training — ${session.title}`,
                dateTime: session.dateTime,
                endDateTime: session.endDateTime,
            })
        }
    }

    if (
        (profile.rsvpSpeakersDinner === 'Yes' || profile.rsvpSpeakersDinner === 'Maybe') &&
        config.speakerDinner
    ) {
        events.push({
            label: 'Speaker dinner',
            dateTime: config.speakerDinner.dateTime,
            endDateTime: config.speakerDinner.endDateTime,
            location: config.speakerDinner.location,
        })
    }

    const weekFromNow = now.plus({ days: 7 })
    return events
        .filter((e) => e.dateTime >= now && e.dateTime <= weekFromNow)
        .sort((a, b) => a.dateTime.toMillis() - b.dateTime.toMillis())
}
