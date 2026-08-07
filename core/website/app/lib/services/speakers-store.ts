/**
 * Speaker portal storage. Speaker records, their sessions, and contact
 * emails are synced from Sessionize + the conference's Jira speakers
 * project; profiles hold the extra info a speaker (or a co-presenter)
 * submits through the portal. See `speakerPortal` on the conference
 * manifest.
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
    /** Set once a Jira speaker issue is matched via the sessionize id field. */
    jiraIssueKey?: string
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
 * the portal — everything that isn't sourced from Sessionize. */
export interface SpeakerProfile {
    sessionizeId: string
    namePhoneticSpelling?: string
    questionsPreference?: QuestionsPreference
    questionsPreferenceOther?: string
    presentationDetails: PresentationDetail[]
    presentationDetailsOther?: string
    optOutOfRecording: boolean
    /** True = use their Sessionize bio as-is; false = use introductionCustomText. */
    introductionUseSessionizeBio: boolean
    introductionCustomText?: string
    anythingElse?: string
    dietaryRequirements?: string
    rsvpSpeakersDinner?: YesNoMaybe
    rsvpSpeakerTraining: SpeakerTrainingSession[]
    registerMeetTheExperts?: YesNoMaybeOther
    registerMeetTheExpertsOther?: string
    /** First time the completion criteria were met; never unset. */
    completedAt?: number
    updatedAt?: number
    /** Email of whoever submitted it — may be a co-presenter, not the subject. */
    updatedBy?: string
}

/** Everything `saveProfile` accepts — same shape as `SpeakerProfile` minus
 * the fields the store computes itself. */
export type SpeakerProfileInput = Omit<SpeakerProfile, 'sessionizeId' | 'completedAt' | 'updatedAt' | 'updatedBy'>

export interface SpeakerListEntry extends SpeakerRecord {
    contacts: string[]
    sessions: SpeakerSession[]
    profile: SpeakerProfile | null
}

/** A speaker + all their co-presenters on shared sessions, for the dashboard. */
export interface SpeakerWorkspace {
    speaker: SpeakerRecord
    sessions: Array<{
        session: SpeakerSession
        /** Every speaker on this session, including the logged-in one. */
        presenters: Array<{ speaker: SpeakerRecord; profile: SpeakerProfile | null }>
    }>
}

/** Result of diffing Sessionize + Jira sources against current D1 state.
 * Computed by the pure `computeSpeakerSyncPlan()` in lib/speakers/sync-plan.ts. */
export interface SpeakerSyncPlan {
    upserts: Array<{
        sessionizeId: string
        year: string
        fullName: string
        tagLine?: string
        bio?: string
        profilePictureUrl?: string
        links: SpeakerLink[]
        jiraIssueKey?: string
    }>
    deactivateSessionizeIds: string[]
    sessionUpserts: Array<{
        sessionizeSpeakerId: string
        sessionizeSessionId: string
        sessionTitle: string
        description?: string
        format?: string
        level?: string
        generalTopic?: string
        talkTopics: string[]
        startsAt?: string
        endsAt?: string
        roomName?: string
        status: string
    }>
    /** Session rows for speakers no longer accepted/waitlisted — removed outright. */
    sessionRemovals: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
    contactAdds: Array<{ email: string; sessionizeId: string }>
    contactRemoves: Array<{ email: string; sessionizeId: string }>
}

export interface SpeakerSyncRun {
    id: number
    trigger: 'cron' | 'manual'
    startedAt: number
    finishedAt?: number
    status: 'running' | 'ok' | 'error'
    speakersUpserted?: number
    speakersDeactivated?: number
    contactsAdded?: number
    contactsRemoved?: number
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
    getProfile(sessionizeId: string): Promise<SpeakerProfile | null>

    /** Every sessionize id sharing a session with the given speaker,
     * including the speaker themselves — the co-presenter edit-authorization
     * primitive. */
    getCoPresenterIds(sessionizeId: string): Promise<string[]>

    /** Everything the dashboard needs: the speaker's sessions, each with
     * every co-presenter's Sessionize info + profile. */
    getWorkspace(sessionizeId: string): Promise<SpeakerWorkspace | null>

    /** Admin view: every speaker for the year (active and departed), with
     * contacts, sessions and profile attached. */
    listSpeakers(year: string): Promise<SpeakerListEntry[]>

    /** Sync inputs: every speaker/contact/session row regardless of year, so
     * the planner can deactivate/remove anything no longer in the source. */
    getAllSpeakersForSync(): Promise<Array<{ sessionizeId: string; active: boolean }>>
    getAllContacts(): Promise<Array<{ email: string; sessionizeId: string }>>
    getAllSpeakerSessions(): Promise<Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>>

    saveProfile(sessionizeId: string, details: SpeakerProfileInput, updatedBy: string): Promise<void>

    /** Stamps completed_at if not already set. Returns true when this call
     * did the stamping (i.e. the profile just became complete). */
    markProfileCompleted(sessionizeId: string): Promise<boolean>

    applySyncPlan(plan: SpeakerSyncPlan): Promise<{
        speakersUpserted: number
        speakersDeactivated: number
        contactsAdded: number
        contactsRemoved: number
    }>

    startSyncRun(trigger: 'cron' | 'manual'): Promise<number>
    finishSyncRun(
        id: number,
        result: Pick<
            SpeakerSyncRun,
            'status' | 'speakersUpserted' | 'speakersDeactivated' | 'contactsAdded' | 'contactsRemoved' | 'error'
        >,
    ): Promise<void>
    getLatestSyncRun(): Promise<SpeakerSyncRun | null>
}
