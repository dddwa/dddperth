import { describe, expect, it } from 'vitest'
import type { SpeakerListEntry, SpeakerSession } from '../services/speakers-store'
import { recordingOptOuts } from './recording-opt-outs'

function session(id: string, title: string, status = 'Accepted'): SpeakerSession {
    return {
        sessionizeSessionId: id,
        sessionTitle: title,
        talkTopics: [],
        status,
        isConfirmed: true,
        foundInSessionize: true,
    }
}

function speaker(overrides: Partial<SpeakerListEntry>): SpeakerListEntry {
    return {
        sessionizeId: 'spk',
        year: '2026',
        fullName: 'Speaker',
        links: [],
        active: true,
        contacts: [],
        sessions: [],
        profile: null,
        sessionDetailsComplete: {},
        meetTheExpertsResponded: false,
        sessionBackupAccepted: {},
        sessionOptedOutOfRecording: {},
        ...overrides,
    }
}

describe('recordingOptOuts', () => {
    it('lists each opted-out accepted session once, with all its presenters', () => {
        const shared = session('s1', 'Zebra talk')
        const result = recordingOptOuts([
            speaker({ sessionizeId: 'a', fullName: 'Ada', sessions: [shared], sessionOptedOutOfRecording: { s1: true } }),
            speaker({ sessionizeId: 'b', fullName: 'Bea', sessions: [shared], sessionOptedOutOfRecording: { s1: true } }),
            speaker({
                sessionizeId: 'c',
                fullName: 'Cam',
                sessions: [session('s2', 'Apple talk')],
                sessionOptedOutOfRecording: { s2: true },
            }),
        ])
        expect(result).toEqual([
            { sessionizeSessionId: 's2', title: 'Apple talk', presenters: ['Cam'] },
            { sessionizeSessionId: 's1', title: 'Zebra talk', presenters: ['Ada', 'Bea'] },
        ])
    })

    it('leaves out recorded, waitlisted and inactive speakers’ sessions', () => {
        const result = recordingOptOuts([
            speaker({ sessions: [session('s1', 'Recorded')], sessionOptedOutOfRecording: { s1: false } }),
            speaker({ sessions: [session('s2', 'Backup', 'Waitlisted')], sessionOptedOutOfRecording: { s2: true } }),
            speaker({ active: false, sessions: [session('s3', 'Dropped')], sessionOptedOutOfRecording: { s3: true } }),
        ])
        expect(result).toEqual([])
    })
})
