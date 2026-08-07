import { describe, expect, it } from 'vitest'
import {
    computeSpeakerSyncPlan,
    type SyncSourceSession,
    type SyncSourceSpeakerContact,
    type SyncSourceSpeakerInfo,
} from './sync-plan'

function session(overrides: Partial<SyncSourceSession> & { sessionizeSessionId: string }): SyncSourceSession {
    return {
        sessionTitle: 'A Talk',
        status: 'Accepted',
        speakerIds: [],
        talkTopics: [],
        ...overrides,
    }
}

function baseArgs(overrides: {
    sessions?: SyncSourceSession[]
    speakerInfo?: SyncSourceSpeakerInfo[]
    jiraContacts?: SyncSourceSpeakerContact[]
    currentSpeakers?: Array<{ sessionizeId: string; active: boolean }>
    currentSpeakerSessions?: Array<{ sessionizeSpeakerId: string; sessionizeSessionId: string }>
    currentContacts?: Array<{ email: string; sessionizeId: string }>
}) {
    return {
        year: '2026',
        sessions: overrides.sessions ?? [],
        speakerInfo: overrides.speakerInfo ?? [],
        jiraContacts: overrides.jiraContacts ?? [],
        currentSpeakers: overrides.currentSpeakers ?? [],
        currentSpeakerSessions: overrides.currentSpeakerSessions ?? [],
        currentContacts: overrides.currentContacts ?? [],
    }
}

describe('computeSpeakerSyncPlan', () => {
    it('upserts a new speaker with a matched Jira issue and grants access', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })],
                speakerInfo: [{ sessionizeId: 'SPK-1', fullName: 'Ada Lovelace' }],
                jiraContacts: [{ issueKey: 'SPK-101', sessionizeId: 'SPK-1', email: 'ada@example.com' }],
            }),
        )

        expect(plan.upserts).toEqual([
            {
                sessionizeId: 'SPK-1',
                year: '2026',
                fullName: 'Ada Lovelace',
                tagLine: undefined,
                bio: undefined,
                profilePictureUrl: undefined,
                links: [],
                jiraIssueKey: 'SPK-101',
            },
        ])
        expect(plan.contactAdds).toEqual([{ email: 'ada@example.com', sessionizeId: 'SPK-1' }])
        expect(plan.deactivateSessionizeIds).toEqual([])
    })

    it('upserts a speaker without a Jira issue but grants no access', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })],
                speakerInfo: [{ sessionizeId: 'SPK-1', fullName: 'Ada Lovelace' }],
            }),
        )

        expect(plan.upserts[0].jiraIssueKey).toBeUndefined()
        expect(plan.contactAdds).toEqual([])
    })

    it('falls back to the sessionize id as the name when speaker info is missing', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({ sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })] }),
        )
        expect(plan.upserts[0].fullName).toBe('SPK-1')
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
                sessions: [
                    session({
                        sessionizeSessionId: 'SESS-1',
                        sessionTitle: 'Pair talk',
                        startsAt: '2026-10-03T09:00:00',
                        endsAt: '2026-10-03T09:45:00',
                        roomName: 'Main Hall',
                        speakerIds: ['SPK-1', 'SPK-2'],
                    }),
                ],
            }),
        )

        expect(plan.sessionUpserts).toEqual([
            {
                sessionizeSpeakerId: 'SPK-1',
                sessionizeSessionId: 'SESS-1',
                sessionTitle: 'Pair talk',
                description: undefined,
                format: undefined,
                level: undefined,
                generalTopic: undefined,
                talkTopics: [],
                startsAt: '2026-10-03T09:00:00',
                endsAt: '2026-10-03T09:45:00',
                roomName: 'Main Hall',
                status: 'Accepted',
            },
            {
                sessionizeSpeakerId: 'SPK-2',
                sessionizeSessionId: 'SESS-1',
                sessionTitle: 'Pair talk',
                description: undefined,
                format: undefined,
                level: undefined,
                generalTopic: undefined,
                talkTopics: [],
                startsAt: '2026-10-03T09:00:00',
                endsAt: '2026-10-03T09:45:00',
                roomName: 'Main Hall',
                status: 'Accepted',
            },
        ])
    })

    it('passes through description, format, level, general topic, talk topics, and speaker links', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [
                    session({
                        sessionizeSessionId: 'SESS-1',
                        speakerIds: ['SPK-1'],
                        description: 'A talk about things',
                        format: '45 mins',
                        level: 'Mostly intermediate',
                        generalTopic: 'Software Development',
                        talkTopics: ['Architecture', 'Backend'],
                    }),
                ],
                speakerInfo: [
                    {
                        sessionizeId: 'SPK-1',
                        fullName: 'Ada Lovelace',
                        links: [
                            { title: 'X (Twitter)', url: 'https://twitter.com/ada', linkType: 'Twitter' },
                            { title: 'LinkedIn', url: 'https://linkedin.com/in/ada', linkType: 'LinkedIn' },
                        ],
                    },
                ],
            }),
        )

        expect(plan.sessionUpserts[0]).toMatchObject({
            description: 'A talk about things',
            format: '45 mins',
            level: 'Mostly intermediate',
            generalTopic: 'Software Development',
            talkTopics: ['Architecture', 'Backend'],
        })
        expect(plan.upserts[0].links).toEqual([
            { title: 'X (Twitter)', url: 'https://twitter.com/ada', linkType: 'Twitter' },
            { title: 'LinkedIn', url: 'https://linkedin.com/in/ada', linkType: 'LinkedIn' },
        ])
    })

    it('tolerates a waitlisted session with no fixed slot', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [
                    session({
                        sessionizeSessionId: 'SESS-2',
                        status: 'Waitlisted',
                        speakerIds: ['SPK-3'],
                    }),
                ],
            }),
        )
        expect(plan.sessionUpserts[0].startsAt).toBeUndefined()
        expect(plan.sessionUpserts[0].status).toBe('Waitlisted')
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

    it('removes contacts dropped from the Jira field', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [session({ sessionizeSessionId: 'SESS-1', speakerIds: ['SPK-1'] })],
                jiraContacts: [{ issueKey: 'SPK-101', sessionizeId: 'SPK-1', email: 'keep@example.com' }],
                currentContacts: [
                    { email: 'keep@example.com', sessionizeId: 'SPK-1' },
                    { email: 'gone@example.com', sessionizeId: 'SPK-1' },
                ],
            }),
        )
        expect(plan.contactAdds).toEqual([])
        expect(plan.contactRemoves).toEqual([{ email: 'gone@example.com', sessionizeId: 'SPK-1' }])
    })

    it('removes contacts of a speaker no longer accepted/waitlisted', () => {
        const plan = computeSpeakerSyncPlan(
            baseArgs({
                sessions: [],
                currentContacts: [{ email: 'old@example.com', sessionizeId: 'SPK-1' }],
            }),
        )
        expect(plan.contactRemoves).toEqual([{ email: 'old@example.com', sessionizeId: 'SPK-1' }])
    })
})
