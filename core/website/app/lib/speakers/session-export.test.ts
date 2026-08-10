import { describe, expect, it } from 'vitest'
import type { SpeakerListEntry } from '~/lib/services/speakers-store'
import { buildSessionExport, collectPhotoSpeakers, slugifyName } from './session-export'

function speaker(overrides: Partial<SpeakerListEntry> = {}): SpeakerListEntry {
    return {
        sessionizeId: 'spk-1',
        year: '2026',
        fullName: 'Ada Lovelace',
        tagLine: 'Analytical Engine enthusiast',
        bio: 'Wrote the first algorithm',
        profilePictureUrl: 'https://sessionize.com/photo.jpg',
        links: [],
        active: true,
        contacts: [],
        sessions: [],
        profile: null,
        sessionDetailsComplete: {},
        ...overrides,
    }
}

describe('buildSessionExport', () => {
    it('groups co-presenters under a single session entry', () => {
        const speakers: SpeakerListEntry[] = [
            speaker({
                sessionizeId: 'spk-1',
                fullName: 'Ada Lovelace',
                sessions: [
                    {
                        sessionizeSessionId: 'sess-1',
                        sessionTitle: 'Computing Machines',
                        description: 'A talk about engines',
                        talkTopics: [],
                        status: 'Accepted',
                        isConfirmed: false,
                    },
                ],
            }),
            speaker({
                sessionizeId: 'spk-2',
                fullName: 'Charles Babbage',
                tagLine: 'Engine builder',
                bio: 'Designed the engine',
                sessions: [
                    {
                        sessionizeSessionId: 'sess-1',
                        sessionTitle: 'Computing Machines',
                        description: 'A talk about engines',
                        talkTopics: [],
                        status: 'Accepted',
                        isConfirmed: false,
                    },
                ],
            }),
        ]

        const result = buildSessionExport(speakers)
        expect(result).toEqual([
            {
                sessionizeSessionId: 'sess-1',
                title: 'Computing Machines',
                description: 'A talk about engines',
                status: 'Accepted',
                speakers: [
                    { sessionizeId: 'spk-1', fullName: 'Ada Lovelace', tagLine: 'Analytical Engine enthusiast', bio: 'Wrote the first algorithm' },
                    { sessionizeId: 'spk-2', fullName: 'Charles Babbage', tagLine: 'Engine builder', bio: 'Designed the engine' },
                ],
            },
        ])
    })

    it('maps any non-Accepted status to Backup', () => {
        const speakers: SpeakerListEntry[] = [
            speaker({
                sessions: [
                    {
                        sessionizeSessionId: 'sess-2',
                        sessionTitle: 'Waitlisted talk',
                        talkTopics: [],
                        status: 'Waitlisted',
                        isConfirmed: false,
                    },
                ],
            }),
        ]

        expect(buildSessionExport(speakers)[0].status).toBe('Backup')
    })

    it('excludes inactive speakers', () => {
        const speakers: SpeakerListEntry[] = [
            speaker({
                active: false,
                sessions: [{ sessionizeSessionId: 'sess-1', sessionTitle: 'Gone', talkTopics: [], status: 'Accepted', isConfirmed: false }],
            }),
        ]

        expect(buildSessionExport(speakers)).toEqual([])
    })

    it('sorts sessions by title', () => {
        const speakers: SpeakerListEntry[] = [
            speaker({
                sessionizeId: 'spk-1',
                sessions: [{ sessionizeSessionId: 'sess-b', sessionTitle: 'Zebra talk', talkTopics: [], status: 'Accepted', isConfirmed: false }],
            }),
            speaker({
                sessionizeId: 'spk-2',
                sessions: [{ sessionizeSessionId: 'sess-a', sessionTitle: 'Aardvark talk', talkTopics: [], status: 'Accepted', isConfirmed: false }],
            }),
        ]

        expect(buildSessionExport(speakers).map((s) => s.title)).toEqual(['Aardvark talk', 'Zebra talk'])
    })
})

describe('collectPhotoSpeakers', () => {
    it('returns one entry per speaker included in the sessions, skipping speakers with no photo', () => {
        const inSession: SpeakerListEntry['sessions'][number] = {
            sessionizeSessionId: 'sess-1',
            sessionTitle: 'Talk',
            talkTopics: [],
            status: 'Accepted',
            isConfirmed: false,
        }
        const speakers: SpeakerListEntry[] = [
            speaker({ sessionizeId: 'spk-1', fullName: 'Ada Lovelace', sessions: [inSession] }),
            speaker({ sessionizeId: 'spk-2', fullName: 'No Photo', profilePictureUrl: undefined, sessions: [inSession] }),
            speaker({ sessionizeId: 'spk-3', fullName: 'Not in a session' }),
        ]
        const sessions = buildSessionExport(speakers)

        const result = collectPhotoSpeakers(sessions, speakers)
        expect(result).toEqual([{ sessionizeId: 'spk-1', fullName: 'Ada Lovelace', profilePictureUrl: 'https://sessionize.com/photo.jpg' }])
    })

    it('dedupes a speaker appearing on multiple sessions', () => {
        const shared = speaker({
            sessionizeId: 'spk-1',
            sessions: [
                { sessionizeSessionId: 'sess-1', sessionTitle: 'Talk One', talkTopics: [], status: 'Accepted', isConfirmed: false },
                { sessionizeSessionId: 'sess-2', sessionTitle: 'Talk Two', talkTopics: [], status: 'Accepted', isConfirmed: false },
            ],
        })
        const sessions = buildSessionExport([shared])

        expect(collectPhotoSpeakers(sessions, [shared])).toHaveLength(1)
    })
})

describe('slugifyName', () => {
    it('lowercases and hyphenates', () => {
        expect(slugifyName('Ada Lovelace')).toBe('ada-lovelace')
    })

    it('strips non-alphanumeric characters', () => {
        expect(slugifyName("O'Brien-Smith Jr.")).toBe('o-brien-smith-jr')
    })
})
