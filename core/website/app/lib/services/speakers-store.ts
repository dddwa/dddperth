/**
 * Speaker portal storage. Speaker records and their sessions are synced from
 * Sessionize; contact emails (who may log in as a given speaker) are added
 * and removed by an admin at /admin/speakers; profiles hold the extra info a
 * speaker (or a co-presenter) submits through the portal. See
 * `speakerPortal` on the conference manifest.
 */

export interface SpeakerLink {
    title: string
    url: string
    /** Sessionize's link type, e.g. "Twitter", "LinkedIn", "Blog", "Company_Website". */
    linkType: string
}

export interface SpeakerRecord {
    sessionizeId: string
    year: string
    fullName: string
    tagLine?: string
    bio?: string
    profilePictureUrl?: string
    links: SpeakerLink[]
    active: boolean
}

export interface SpeakerSession {
    sessionizeSessionId: string
    sessionTitle: string
    description?: string
    /** Sessionize "Session format" category, e.g. "45 mins", "Keynote". */
    format?: string
    /** Sessionize "Level" category, e.g. "Mostly intermediate". */
    level?: string
    /** Sessionize "General Topic Category" — single-select. */
    generalTopic?: string
    /** Sessionize "Talk Topics" — multi-select. */
    talkTopics: string[]
    /** Null for waitlisted speakers with no fixed agenda slot yet. */
    startsAt?: string
    endsAt?: string
    roomName?: string
    /** Raw Sessionize status (Accepted/Waitlisted/etc). */
    status: string
    /** Sessionize's "Owner Confirmed" flag — session-level, set once the
     * session owner confirms their acceptance in Sessionize. */
    isConfirmed: boolean
    /** False when this session id wasn't in Sessionize's live payload at
     * all — the fields above are then just a placeholder (raw id as the
     * title). For a session D1 still has linkage for, that means Sessionize
     * no longer lists it — most likely declined/withdrawn since the sync
     * last saw it. */
    foundInSessionize: boolean
}

export const QUESTIONS_PREFERENCE_OPTIONS = ['Yes', 'No', 'Yes, moderated', 'Undecided', 'Other'] as const
export type QuestionsPreference = (typeof QUESTIONS_PREFERENCE_OPTIONS)[number]

export const PRESENTATION_DETAIL_OPTIONS = ['Video', 'Audio', 'Audience Participation', 'Live Demo', 'Other'] as const
export type PresentationDetail = (typeof PRESENTATION_DETAIL_OPTIONS)[number]

export const YES_NO_MAYBE_OPTIONS = ['Yes', 'No', 'Maybe'] as const
export type YesNoMaybe = (typeof YES_NO_MAYBE_OPTIONS)[number]

export const YES_NO_MAYBE_OTHER_OPTIONS = ['Yes', 'No', 'Maybe', 'Other'] as const
export type YesNoMaybeOther = (typeof YES_NO_MAYBE_OTHER_OPTIONS)[number]

export const SPEAKER_TRAINING_SESSION_OPTIONS = ['Session 1', 'Session 2', 'Session 3'] as const
export type SpeakerTrainingSession = (typeof SPEAKER_TRAINING_SESSION_OPTIONS)[number]

/** Extra info a speaker (or a co-presenter, on their behalf) submits through
 * the portal — everything that isn't sourced from Sessionize. Per-presenter
 * only; the questions/presentation-format/recording/anything-else fields
 * that apply to the whole session live on `SessionDetails` instead, shared
 * by every presenter on that session. */
export interface SpeakerProfile {
    sessionizeId: string
    namePhoneticSpelling?: string
    /** True = use their Sessionize bio as-is; false = use introductionCustomText. */
    introductionUseSessionizeBio: boolean
    introductionCustomText?: string
    /** RSVP'd through its own dedicated modal, not the main session-details
     * form — see `saveSpeakerDinnerRsvp`. */
    dietaryRequirements?: string
    /** Preliminary opt-in — only once this is Yes/Maybe/Other does the
     * meetTheExperts checklist item appear at all, opening the dedicated
     * registration modal. The actual registration (slots + bio) lives in
     * `MeetTheExpertsStore`, not here — see `services.meetTheExperts`. */
    registerMeetTheExperts?: YesNoMaybeOther
    registerMeetTheExpertsOther?: string
    /** RSVP'd through its own dedicated modal, not the main session-details
     * form — see `saveSpeakerDinnerRsvp`. */
    rsvpSpeakersDinner?: YesNoMaybe
    /** Which configured training sessions they're attending — also RSVP'd
     * through its own modal, see `saveSpeakerTrainingRsvp`. */
    rsvpSpeakerTraining: SpeakerTrainingSession[]
    /** Stamped every time the training RSVP is submitted (even with zero
     * sessions selected — "not attending any" is still a completed RSVP).
     * Presence, not the session list length, is what marks the checklist
     * item done. */
    rsvpSpeakerTrainingRespondedAt?: number
    /** First time the completion criteria were met; never unset. */
    completedAt?: number
    updatedAt?: number
    /** Email of whoever submitted it — may be a co-presenter, not the subject. */
    updatedBy?: string
    /** Self-reported from the dashboard checklist — set the first time the
     * speaker marks their complimentary ticket as claimed; never unset. */
    ticketClaimedAt?: number
    /** Self-reported from the dashboard checklist's "I've already confirmed
     * it" button — set the first time, alongside a notification email;
     * never unset. Independent of the synced `isConfirmed` on the session
     * itself, which may lag behind. */
    sessionConfirmedReportedAt?: number
}

/** Everything the session-details modal's `save-profile` action accepts —
 * same shape as `SpeakerProfile` minus the fields the store computes itself,
 * dietary requirements (asked as part of the speaker dinner RSVP instead),
 * and the RSVPs, which are saved through their own dedicated actions
 * (`saveSpeakerTrainingRsvp` / `saveSpeakerDinnerRsvp` /
 * `services.meetTheExperts.saveRegistration`) so that submitting this form
 * can never clobber an RSVP already on file. */
export type SpeakerProfileInput = Omit<
    SpeakerProfile,
    | 'sessionizeId'
    | 'completedAt'
    | 'updatedAt'
    | 'updatedBy'
    | 'ticketClaimedAt'
    | 'dietaryRequirements'
    | 'rsvpSpeakersDinner'
    | 'rsvpSpeakerTraining'
    | 'rsvpSpeakerTrainingRespondedAt'
>

/** The questions/presentation-format/recording/anything-else fields that
 * apply to a whole session — shared by every presenter on it, filled in once
 * via the session-details modal's session-level form. */
export interface SessionDetails {
    sessionizeSessionId: string
    questionsPreference?: QuestionsPreference
    questionsPreferenceOther?: string
    presentationDetails: PresentationDetail[]
    presentationDetailsOther?: string
    optOutOfRecording: boolean
    anythingElse?: string
    updatedAt: number
    /** Email of whoever last submitted it — may be any presenter on the session. */
    updatedBy: string
}

export type SessionDetailsInput = Omit<SessionDetails, 'sessionizeSessionId' | 'updatedAt' | 'updatedBy'>

export interface SpeakerListEntry extends SpeakerRecord {
    contacts: string[]
    sessions: SpeakerSession[]
    profile: SpeakerProfile | null
    /** Whether each session's shared session-level details (see
     * `SessionDetails`) are filled in, keyed by sessionizeSessionId — just
     * enough for the admin follow-up list to reuse `speakerChecklist`
     * without hydrating full `SessionDetails` rows. */
    sessionDetailsComplete: Record<string, boolean>
    /** Whether a Meet-the-Experts registration (see `MeetTheExpertsStore`)
     * is on file for this speaker — same "just enough for `speakerChecklist`"
     * idiom as `sessionDetailsComplete`. */
    meetTheExpertsResponded: boolean
    /** Whether each session has had its backup-speaker acceptance self-
     * reported by any presenter — session-level, keyed by
     * sessionizeSessionId, same "just enough for `speakerChecklist`" idiom
     * as `sessionDetailsComplete`. */
    sessionBackupAccepted: Record<string, boolean>
}

/** A speaker + all their co-presenters on shared sessions, for the dashboard. */
export interface SpeakerWorkspace {
    speaker: SpeakerRecord
    sessions: Array<{
        session: SpeakerSession
        sessionDetails: SessionDetails | null
        /** Self-reported "I accept being a backup speaker" for this session
         * — session-level, shared by every presenter; see
         * `markBackupAccepted`. Only meaningful for a non-Accepted session. */
        backupAccepted: boolean
        /** Every speaker on this session, including the logged-in one. */
        presenters: Array<{ speaker: SpeakerRecord; profile: SpeakerProfile | null }>
    }>
}

/** Result of diffing Sessionize against current D1 state. Computed by the
 * pure `computeSpeakerSyncPlan()` in lib/speakers/sync-plan.ts. Only ids and
 * linkage — Sessionize content (name, bio, session title, etc.) is read live
 * at request time instead of synced in. Contacts aren't part of this either
 * — they're admin-managed directly in D1, independent of the sync. */
export interface SpeakerSyncPlan {
    upserts: Array<{ sessionizeId: string; year: string }>
    deactivateSessionizeIds: string[]
    sessionUpserts: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
    /** Session rows for speakers no longer accepted/waitlisted — removed outright. */
    sessionRemovals: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
}

export interface SpeakerSyncRun {
    id: number
    trigger: 'cron' | 'manual'
    startedAt: number
    finishedAt?: number
    status: 'running' | 'ok' | 'error'
    speakersUpserted?: number
    speakersDeactivated?: number
    error?: string
}

export interface SpeakersStore {
    /** True when the email belongs to at least one active speaker. Feeds the
     * magic-link "may log in" check alongside the admin allowlist. */
    isSpeakerContact(email: string): Promise<boolean>

    /** The active speaker workspace for a contact email. If an email somehow
     * maps to several active speakers, the lowest sessionize id wins. */
    getSpeakerForEmail(email: string): Promise<SpeakerRecord | null>

    getSpeaker(sessionizeId: string): Promise<SpeakerRecord | null>
    getContactEmails(sessionizeId: string): Promise<string[]>

    /** Admin-managed: grants portal access to `email` for this speaker.
     * Idempotent. */
    addContact(sessionizeId: string, email: string): Promise<void>
    /** Admin-managed: revokes portal access. Idempotent. */
    removeContact(sessionizeId: string, email: string): Promise<void>

    getProfile(sessionizeId: string): Promise<SpeakerProfile | null>

    getSessionDetails(sessionizeSessionId: string): Promise<SessionDetails | null>

    /** Every sessionize id sharing a session with the given speaker,
     * including the speaker themselves — the co-presenter edit-authorization
     * primitive. */
    getCoPresenterIds(sessionizeId: string): Promise<string[]>

    /** True when the speaker presents on the given session — the
     * session-details-form edit-authorization primitive, same idiom as
     * `getCoPresenterIds` but for the session-level form. */
    isSpeakerOnSession(sessionizeId: string, sessionizeSessionId: string): Promise<boolean>

    /** Everything the dashboard needs: the speaker's sessions, each with its
     * shared session-level details and every co-presenter's Sessionize
     * info + profile. */
    getWorkspace(sessionizeId: string): Promise<SpeakerWorkspace | null>

    /** Admin view: every speaker for the year (active and departed), with
     * contacts, sessions and profile attached. */
    listSpeakers(year: string): Promise<SpeakerListEntry[]>

    /** Sync inputs: every speaker/session row regardless of year, so the
     * planner can deactivate/remove anything no longer in the source. */
    getAllSpeakersForSync(): Promise<Array<{ sessionizeId: string; active: boolean }>>
    getAllSpeakerSessions(): Promise<Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>>

    saveProfile(sessionizeId: string, details: SpeakerProfileInput, updatedBy: string): Promise<void>

    /** Shared by every presenter on the session — any of them may submit it
     * on the group's behalf. */
    saveSessionDetails(sessionizeSessionId: string, details: SessionDetailsInput, updatedBy: string): Promise<void>

    /** Stamps completed_at if not already set. Returns true when this call
     * did the stamping (i.e. the profile just became complete). */
    markProfileCompleted(sessionizeId: string): Promise<boolean>

    /** Self-reported ticket claim for the dashboard checklist. Idempotent —
     * stamps ticket_claimed_at only the first time it's called, creating the
     * profile row if the speaker hasn't saved one yet. */
    markTicketClaimed(sessionizeId: string, updatedBy: string): Promise<void>

    /** Speaker-training RSVP, from its own modal. Overwrites the session
     * selection and re-stamps rsvp_speaker_training_responded_at every call
     * — unlike ticket claim, an RSVP can change. Creates the profile row if
     * the speaker hasn't saved one yet. Never touches any other column. */
    saveSpeakerTrainingRsvp(
        sessionizeId: string,
        sessions: SpeakerTrainingSession[],
        updatedBy: string,
    ): Promise<void>

    /** Speaker-dinner RSVP, from its own modal — also where dietary
     * requirements are asked, since that's only relevant if they're
     * attending. Same idiom as saveSpeakerTrainingRsvp — only touches
     * rsvp_speakers_dinner and dietary_requirements. */
    saveSpeakerDinnerRsvp(
        sessionizeId: string,
        response: YesNoMaybe,
        dietaryRequirements: string | undefined,
        updatedBy: string,
    ): Promise<void>

    /** Self-reported "I've already confirmed it" from the checklist.
     * Idempotent — stamps `sessionConfirmedReportedAt` only the first time,
     * creating the profile row if the speaker hasn't saved one yet. Returns
     * true only when this call did the stamping, so the caller knows
     * whether to send the notification email. */
    markSessionConfirmed(sessionizeId: string, updatedBy: string): Promise<boolean>

    /** Self-reported "I accept being a backup speaker" from the checklist —
     * session-level: any presenter on the session may submit it on the
     * whole session's behalf, same idiom as `saveSessionDetails`. Idempotent
     * — stamps the acceptance only the first time for a given session. */
    markBackupAccepted(sessionizeSessionId: string, updatedBy: string): Promise<void>

    applySyncPlan(plan: SpeakerSyncPlan): Promise<{
        speakersUpserted: number
        speakersDeactivated: number
    }>

    startSyncRun(trigger: 'cron' | 'manual'): Promise<number>
    finishSyncRun(
        id: number,
        result: Pick<SpeakerSyncRun, 'status' | 'speakersUpserted' | 'speakersDeactivated' | 'error'>,
    ): Promise<void>
    getLatestSyncRun(): Promise<SpeakerSyncRun | null>
}
