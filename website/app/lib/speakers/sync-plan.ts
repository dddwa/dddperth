import type { SpeakerSyncPlan } from '../services/speakers-store'

/**
 * Pure sync planning: Sessionize sessions in, diff against current D1
 * state, plan out. No I/O — the D1/Sessionize plumbing lives in the sync
 * service. Unit tests in sync-plan.test.ts.
 *
 * Only ids and linkage are planned here — Sessionize content (name, bio,
 * session title, schedule slot, etc.) is read live at request time (see
 * lib/speakers/map-sessionize.ts) instead of being synced into D1.
 */

/** A session as parsed from Sessionize, already filtered to the statuses
 * that grant portal access (e.g. Accepted/Waitlisted) — just enough to
 * compute which speaker/session ids the portal knows about. */
export interface SyncSourceSession {
    sessionizeSessionId: string
    /** Sessionize speaker ids presenting this session (co-presenters share one row each). */
    speakerIds: string[]
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
    currentSpeakers: Array<{ sessionizeId: string; active: boolean }>
    currentSpeakerSessions: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
}): SpeakerSyncPlan {
    const { year, sessions, currentSpeakers, currentSpeakerSessions } = args

    const activeSpeakerIds = new Set<string>()
    for (const session of sessions) {
        for (const speakerId of session.speakerIds) activeSpeakerIds.add(speakerId)
    }

    const upserts = [...activeSpeakerIds].map((sessionizeId) => ({ sessionizeId, year }))

    const deactivateSessionizeIds = currentSpeakers
        .filter((s) => s.active && !activeSpeakerIds.has(s.sessionizeId))
        .map((s) => s.sessionizeId)

    const sessionUpserts = sessions.flatMap((session) =>
        session.speakerIds.map((speakerId) => ({
            sessionizeSpeakerId: speakerId,
            sessionizeSessionId: session.sessionizeSessionId,
        })),
    )

    const sourceSessionPairs = new Set(sessionUpserts.map((s) => `${s.sessionizeSpeakerId} ${s.sessionizeSessionId}`))
    const sessionRemovals = currentSpeakerSessions
        .filter((s) => !sourceSessionPairs.has(`${s.sessionizeSpeakerId} ${s.sessionizeSessionId}`))
        .map((s) => ({ sessionizeSpeakerId: s.sessionizeSpeakerId, sessionizeSessionId: s.sessionizeSessionId }))

    return { upserts, deactivateSessionizeIds, sessionUpserts, sessionRemovals }
}
