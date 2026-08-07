import type { SpeakerLink, SpeakerSyncPlan } from '../services/speakers-store'

/**
 * Pure sync planning: Sessionize sessions + Jira speaker issues in, diff
 * against current D1 state, plan out. No I/O — the D1/Sessionize/Jira
 * plumbing lives in the sync service. Unit tests in sync-plan.test.ts.
 */

/** A session as parsed from Sessionize, already filtered to the statuses
 * that grant portal access (e.g. Accepted/Waitlisted). */
export interface SyncSourceSession {
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
    /** Null/undefined for waitlisted speakers with no fixed slot yet. */
    startsAt?: string
    endsAt?: string
    roomName?: string
    status: string
    /** Sessionize speaker ids presenting this session (co-presenters share one row each). */
    speakerIds: string[]
}

/** Bio/tagline/picture/links for a Sessionize speaker, independent of which
 * session(s) they're on. */
export interface SyncSourceSpeakerInfo {
    sessionizeId: string
    fullName: string
    tagLine?: string
    bio?: string
    profilePictureUrl?: string
    links?: SpeakerLink[]
}

/** A speaker's Jira issue, matched via the sessionize id custom field. */
export interface SyncSourceSpeakerContact {
    issueKey: string
    sessionizeId: string
    email: string
}

/**
 * Diffs the Sessionize + Jira source against current D1 state:
 *   - every speaker id appearing on an accepted/waitlisted session upserts
 *     (reactivating soft-deleted ones); their Jira issue key/email attach
 *     when a matching Jira issue exists, but a speaker still upserts (and
 *     gets a `speakers`/`speaker_sessions` row) even without one — they
 *     just get no `speaker_contacts` row, so no portal access, until the
 *     Jira side is set up
 *   - active speakers missing from the accepted/waitlisted set deactivate
 *     (soft delete)
 *   - (speaker, session) pairs are upserted/removed to match the source
 *     exactly, independent of the speaker's active flag
 *   - contact pairs are set-diffed in both directions; removals are hard
 *     deletes so a departed contact can't regain access when their speaker
 *     reappears in a later year
 */
export function computeSpeakerSyncPlan(args: {
    year: string
    sessions: SyncSourceSession[]
    speakerInfo: SyncSourceSpeakerInfo[]
    jiraContacts: SyncSourceSpeakerContact[]
    currentSpeakers: Array<{ sessionizeId: string; active: boolean }>
    currentSpeakerSessions: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
    currentContacts: Array<{ email: string; sessionizeId: string }>
}): SpeakerSyncPlan {
    const { year, sessions, speakerInfo, jiraContacts, currentSpeakers, currentSpeakerSessions, currentContacts } =
        args

    const infoById = new Map(speakerInfo.map((s) => [s.sessionizeId, s]))
    const jiraById = new Map(jiraContacts.map((c) => [c.sessionizeId, c]))

    const activeSpeakerIds = new Set<string>()
    for (const session of sessions) {
        for (const speakerId of session.speakerIds) activeSpeakerIds.add(speakerId)
    }

    const upserts = [...activeSpeakerIds].map((sessionizeId) => {
        const info = infoById.get(sessionizeId)
        const jira = jiraById.get(sessionizeId)
        return {
            sessionizeId,
            year,
            fullName: info?.fullName ?? sessionizeId,
            tagLine: info?.tagLine,
            bio: info?.bio,
            profilePictureUrl: info?.profilePictureUrl,
            links: info?.links ?? [],
            jiraIssueKey: jira?.issueKey,
        }
    })

    const deactivateSessionizeIds = currentSpeakers
        .filter((s) => s.active && !activeSpeakerIds.has(s.sessionizeId))
        .map((s) => s.sessionizeId)

    const sessionUpserts = sessions.flatMap((session) =>
        session.speakerIds.map((speakerId) => ({
            sessionizeSpeakerId: speakerId,
            sessionizeSessionId: session.sessionizeSessionId,
            sessionTitle: session.sessionTitle,
            description: session.description,
            format: session.format,
            level: session.level,
            generalTopic: session.generalTopic,
            talkTopics: session.talkTopics,
            startsAt: session.startsAt,
            endsAt: session.endsAt,
            roomName: session.roomName,
            status: session.status,
        })),
    )

    const sourceSessionPairs = new Set(sessionUpserts.map((s) => `${s.sessionizeSpeakerId} ${s.sessionizeSessionId}`))
    const sessionRemovals = currentSpeakerSessions
        .filter((s) => !sourceSessionPairs.has(`${s.sessionizeSpeakerId} ${s.sessionizeSessionId}`))
        .map((s) => ({ sessionizeSpeakerId: s.sessionizeSpeakerId, sessionizeSessionId: s.sessionizeSessionId }))

    // Only speakers matched to a Jira issue with an email get portal access.
    const currentPairs = new Set(currentContacts.map((c) => `${c.email} ${c.sessionizeId}`))
    const sourcePairs = new Set<string>()
    const contactAdds: Array<{ email: string; sessionizeId: string }> = []
    for (const speakerId of activeSpeakerIds) {
        const jira = jiraById.get(speakerId)
        if (!jira) continue
        const pair = `${jira.email} ${speakerId}`
        sourcePairs.add(pair)
        if (!currentPairs.has(pair)) contactAdds.push({ email: jira.email, sessionizeId: speakerId })
    }

    const contactRemoves = currentContacts.filter((c) => !sourcePairs.has(`${c.email} ${c.sessionizeId}`))

    return { upserts, deactivateSessionizeIds, sessionUpserts, sessionRemovals, contactAdds, contactRemoves }
}
