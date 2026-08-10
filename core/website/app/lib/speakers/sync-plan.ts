import type { SpeakerLink, SpeakerSyncPlan } from '../services/speakers-store'

/**
 * Pure sync planning: Sessionize sessions in, diff against current D1
 * state, plan out. No I/O — the D1/Sessionize plumbing lives in the sync
 * service. Unit tests in sync-plan.test.ts.
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

/**
 * Diffs the Sessionize source against current D1 state:
 *   - every speaker id appearing on an accepted/waitlisted session upserts
 *     (reactivating soft-deleted ones), getting a `speakers`/
 *     `speaker_sessions` row
 *   - active speakers missing from the accepted/waitlisted set deactivate
 *     (soft delete)
 *   - (speaker, session) pairs are upserted/removed to match the source
 *     exactly, independent of the speaker's active flag
 *
 * Contact emails (who may log in as a given speaker) are never touched
 * here — they're admin-managed directly in D1, out of the sync's reach.
 */
export function computeSpeakerSyncPlan(args: {
    year: string
    sessions: SyncSourceSession[]
    speakerInfo: SyncSourceSpeakerInfo[]
    currentSpeakers: Array<{ sessionizeId: string; active: boolean }>
    currentSpeakerSessions: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
}): SpeakerSyncPlan {
    const { year, sessions, speakerInfo, currentSpeakers, currentSpeakerSessions } = args

    const infoById = new Map(speakerInfo.map((s) => [s.sessionizeId, s]))

    const activeSpeakerIds = new Set<string>()
    for (const session of sessions) {
        for (const speakerId of session.speakerIds) activeSpeakerIds.add(speakerId)
    }

    const upserts = [...activeSpeakerIds].map((sessionizeId) => {
        const info = infoById.get(sessionizeId)
        return {
            sessionizeId,
            year,
            fullName: info?.fullName ?? sessionizeId,
            tagLine: info?.tagLine,
            bio: info?.bio,
            profilePictureUrl: info?.profilePictureUrl,
            links: info?.links ?? [],
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

    return { upserts, deactivateSessionizeIds, sessionUpserts, sessionRemovals }
}
