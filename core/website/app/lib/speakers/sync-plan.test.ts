import { describe, expect, it } from 'vitest'
import { computeSpeakerSyncPlan, type SyncSourceSession } from './sync-plan'

function session(overrides: Partial<SyncSourceSession> & { sessionizeSessionId: string }): SyncSourceSession {
    return {
        speakerIds: [],
        ...overrides,
    }
}

function baseArgs(overrides: {
    sessions?: SyncSourceSession[]
    currentSpeakers?: Array<{ sessionizeId: string; active: boolean }>
    currentSpeakerSessions?: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
}) {
    return {
        year: '2026',
        sessions: overrides.sessions ?? [],
        currentSpeakers: overrides.currentSpeakers ?? [],
        currentSpeakerSessions: overrides.currentSpeakerSessions ?? [],
    }
}

describe('computeSpeakerSyncPlan', () => {
    it('upserts a speaker appearing on an accepted/waitlisted session', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })],
            }),
        )

        expect(plan.upserts).toEqual([{ sessionizeId: 'SPK-1', year: '2026' }])
        expect(plan.deactivateSessionizeIds).toEqual([])
    })

    it('deactivates active speakers no longer accepted/waitlisted', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({ currentSpeakers: [{ sessionizeId: 'SPK-1', active: true }] }),
        )
        expect(plan.deactivateSessionizeIds).toEqual(['SPK-1'])
    })

    it('does not re-deactivate already-inactive speakers', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({ currentSpeakers: [{ sessionizeId: 'SPK-1', active: false }] }),
        )
        expect(plan.deactivateSessionizeIds).toEqual([])
    })

    it('produces a session row per co-presenter on a shared session', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1', 'SPK-2'] })],
            }),
        )

        expect(plan.sessionUpserts).toEqual([
            { sessionizeSpeakerId: 'SPK-1', sessionizeSessionId: 'SESS-1' },
            { sessionizeSpeakerId: 'SPK-2', sessionizeSessionId: 'SESS-1' },
        ])
    })

    it('removes a (speaker, session) pair no longer in the source', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [],
                currentSpeakerSessions: [{ sessionizeSpeakerId: 'SPK-1', sessionizeSessionId: 'SESS-1' }],
            }),
        )
        expect(plan.sessionRemovals).toEqual([{ sessionizeSpeakerId: 'SPK-1', sessionizeSessionId: 'SESS-1' }])
    })

    it('keeps a (speaker, session) pair still present in the source', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })],
                currentSpeakerSessions: [{ sessionizeSpeakerId: 'SPK-1', sessionizeSessionId: 'SESS-1' }],
            }),
        )
        expect(plan.sessionRemovals).toEqual([])
    })
})
