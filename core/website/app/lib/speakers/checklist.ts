import { DateTime } from 'luxon'
import { SPEAKER_CHECKLIST_ITEMS, checklistDueDate, type ChecklistItemDefinition } from './checklist-items'
import type { SpeakerProfile } from '../services/speakers-store'

/**
 * Pure checklist rules for the speaker dashboard's "outstanding items" card.
 * No platform imports — unit-testable in node. Mirrors lib/sponsors/profile.ts.
 */

/** Session details = the session-level Q&A preference (shared by every
 * presenter on the session — see `SpeakerSessionChecklistInput`) plus the
 * viewer's own introduction. Doesn't require every optional field ("anything
 * else", etc) — just enough that the organisers aren't missing the
 * essentials. A speaker with no sessions has nothing to fill in yet. */
export function isSessionDetailsComplete(
    profile: SpeakerProfile | null,
    sessions: SpeakerSessionChecklistInput[],
): boolean {
    if (!profile) return false
    const introductionReady = profile.introductionUseSessionizeBio || Boolean(profile.introductionCustomText)
    if (!introductionReady || sessions.length === 0) return false
    return sessions.every((s) => s.sessionDetailsComplete)
}

/** Meet the Experts registration only becomes an outstanding item once the
 * speaker has opted in (Yes/Maybe/Other) on the main session-details form —
 * answering "No", or not answering at all, means there's nothing to
 * schedule. Filters the checklist item out entirely otherwise; see
 * `speakerChecklist`. */
export function isMeetTheExpertsApplicable(profile: SpeakerProfile | null): boolean {
    return profile?.registerMeetTheExperts === 'Yes' || profile?.registerMeetTheExperts === 'Maybe' || profile?.registerMeetTheExperts === 'Other'
}

/** Done once the Meet-the-Experts registration (see `MeetTheExpertsStore`)
 * has been submitted at all — same idiom as `isSpeakerTrainingRsvpComplete`:
 * an empty slot selection ("none work for me") is still a deliberate,
 * complete answer. Takes the registration's `respondedAt` directly rather
 * than a `SpeakerProfile`, since the registration now lives in its own
 * table. */
export function isMeetTheExpertsRegistrationComplete(respondedAt: number | undefined): boolean {
    return Boolean(respondedAt)
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

/** A backup speaker has sessions, but none of them Accepted (e.g. all
 * Waitlisted) — nothing to confirm in Sessionize, so `confirmSession` is
 * filtered out in favour of `acceptBackupSpeaker`; see `speakerChecklist`.
 * A speaker with no sessions at all isn't "backup", just not yet synced. */
export function isBackupSpeaker(sessions: SpeakerSessionChecklistInput[]): boolean {
    return sessions.length > 0 && sessions.every((s) => s.status !== 'Accepted')
}

/** Done once every non-Accepted (backup) session has had its acceptance
 * self-reported — session-level and shared by every presenter (see
 * `backupAccepted` on `SpeakerSessionChecklistInput`), so a co-presenter
 * accepting on a dual-speaker session counts too. */
export function isBackupAccepted(sessions: SpeakerSessionChecklistInput[]): boolean {
    const backupSessions = sessions.filter((s) => s.status !== 'Accepted')
    return backupSessions.length > 0 && backupSessions.every((s) => s.backupAccepted)
}

export type ChecklistUrgency = 'normal' | 'upcoming' | 'overdue'

/** `overdue` (red) when done items are ignored and the due date is within a
 * day or already past; `upcoming` (orange) when within a week; `normal`
 * otherwise or when there's no due date. Exported so urgency thresholds are
 * unit-testable without needing to inject a due date through
 * `speakerChecklist` (its items' due dates are fixed, in checklist-items.ts). */
export function urgencyFor(dueDateIso: string | undefined, done: boolean, now: DateTime): ChecklistUrgency {
    if (done || !dueDateIso) return 'normal'
    const due = DateTime.fromISO(dueDateIso)
    if (due <= now.plus({ days: 1 })) return 'overdue'
    if (due <= now.plus({ days: 7 })) return 'upcoming'
    return 'normal'
}

/** Human "how long is left" label for a due date — e.g. for the admin
 * follow-up list, so it's obvious at a glance whether there's a week to go
 * or the deadline already passed. Rounds to the nearest whole day; null with
 * no due date. */
export function dueDateRemainingLabel(dueDateIso: string | undefined, now: DateTime): string | null {
    if (!dueDateIso) return null
    const due = DateTime.fromISO(dueDateIso)
    const days = Math.round(due.diff(now, 'days').days)
    if (days === 0) return 'Due today'
    if (days > 0) return `${days} day${days === 1 ? '' : 's'} left`
    const overdueDays = Math.abs(days)
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`
}

/** One session's status + Sessionize confirmation flag + whether its shared
 * session-level details (see `SessionDetails`) are filled in — everything
 * the confirm-session and session-details checklist rules need. */
export interface SpeakerSessionChecklistInput {
    status: string
    isConfirmed: boolean
    sessionDetailsComplete: boolean
    /** Self-reported "I accept being a backup speaker" for this session —
     * session-level, set by any presenter on it. Only meaningful for a
     * non-Accepted session; see `isBackupAccepted`. */
    backupAccepted: boolean
}

/** Done once every Accepted session is confirmed in Sessionize (synced), or
 * the speaker self-reports via the checklist button. A speaker with no
 * Accepted sessions yet (e.g. still Waitlisted) has nothing to confirm. */
export function isSessionConfirmed(profile: SpeakerProfile | null, sessions: SpeakerSessionChecklistInput[]): boolean {
    if (profile?.sessionConfirmedReportedAt) return true
    const accepted = sessions.filter((s) => s.status === 'Accepted')
    return accepted.length > 0 && accepted.every((s) => s.isConfirmed)
}

export interface SpeakerChecklistItem {
    key: ChecklistItemDefinition['key']
    label: string
    done: boolean
    /** ISO 8601 — loaders can't hand DateTime instances across the wire. */
    dueDateIso?: string
    urgency: ChecklistUrgency
    /** True once the due date has actually passed (not just "close to it" —
     * see `urgency`, which goes red a day early). Items with no due date are
     * never past due. Drives whether a completed item can still be reopened
     * and edited from the checklist. */
    isPastDue: boolean
}

/** One "is it done" predicate per item key — kept in code (rather than
 * checklist-items.ts) since it depends on real profile/session data. Every
 * key except `meetTheExperts` (special-cased in `speakerChecklist`, since its
 * completion comes from a `MeetTheExpertsRegistration`, not `profile`/
 * `sessions`) must have an entry here. */
const CHECKLIST_DONE_PREDICATES: Record<
    Exclude<ChecklistItemDefinition['key'], 'meetTheExperts'>,
    (profile: SpeakerProfile | null, sessions: SpeakerSessionChecklistInput[]) => boolean
> = {
    confirmSession: (profile, sessions) => isSessionConfirmed(profile, sessions),
    sessionDetails: (profile, sessions) => isSessionDetailsComplete(profile, sessions),
    claimTicket: (profile) => isTicketClaimed(profile),
    speakerTraining: (profile) => isSpeakerTrainingRsvpComplete(profile),
    speakerDinner: (profile) => isSpeakerDinnerRsvpComplete(profile),
    acceptBackupSpeaker: (_profile, sessions) => isBackupAccepted(sessions),
}

export function speakerChecklist(
    profile: SpeakerProfile | null,
    sessions: SpeakerSessionChecklistInput[],
    meetTheExpertsResponded: boolean,
    now: DateTime = DateTime.now(),
): SpeakerChecklistItem[] {
    const backup = isBackupSpeaker(sessions)
    return SPEAKER_CHECKLIST_ITEMS.filter((definition) => {
        if (definition.key === 'meetTheExperts') return isMeetTheExpertsApplicable(profile)
        // A backup speaker has no Accepted session to confirm — they get
        // acceptBackupSpeaker instead of confirmSession.
        if (definition.key === 'confirmSession') return !backup
        if (definition.key === 'acceptBackupSpeaker') return backup
        return true
    }).map((definition) => {
        const done =
            definition.key === 'meetTheExperts'
                ? isMeetTheExpertsRegistrationComplete(meetTheExpertsResponded ? 1 : undefined)
                : CHECKLIST_DONE_PREDICATES[definition.key](profile, sessions)
        const dueDateIso = checklistDueDate(definition.key)?.toISO() ?? undefined
        const isPastDue = Boolean(dueDateIso && DateTime.fromISO(dueDateIso) < now)
        return {
            key: definition.key,
            label: definition.label,
            done,
            dueDateIso,
            urgency: urgencyFor(dueDateIso, done, now),
            isPastDue,
        }
    })
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
