import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { SpeakerListEntry } from '../services/speakers-store'
import { speakersMissingChecklistItem } from './follow-up'

const NOW = DateTime.fromISO('2026-08-20T09:00:00', { zone: 'Australia/Perth' })

function speaker(overrides: Partial<SpeakerListEntry> = {}): SpeakerListEntry {
    return {
        sessionizeId: 'spk-1',
        year: '2026',
        fullName: 'Amy Kapernick',
        links: [],
        active: true,
        contacts: ['amy@example.com'],
        sessions: [],
        profile: null,
        sessionDetailsComplete: {},
        meetTheExpertsResponded: false,
        sessionBackupAccepted: {},
        ...overrides,
    }
}

describe('speakersMissingChecklistItem', () => {
    it('includes an active speaker with no profile at all', () => {
        const targets = speakersMissingChecklistItem([speaker()], 'sessionDetails', NOW)
        expect(targets).toEqual([{ sessionizeId: 'spk-1', fullName: 'Amy Kapernick', contacts: ['amy@example.com'] }])
    })

    it('excludes a speaker who has completed the item', () => {
        const done = speaker({
            profile: {
                sessionizeId: 'spk-1',
                introductionUseSessionizeBio: true,
                rsvpSpeakerTraining: [],
                rsvpSpeakerTrainingRespondedAt: 1700000000,
            },
        })
        expect(speakersMissingChecklistItem([done], 'speakerTraining', NOW)).toEqual([])
    })

    it('excludes inactive speakers even if the item is outstanding', () => {
        const inactive = speaker({ active: false })
        expect(speakersMissingChecklistItem([inactive], 'sessionDetails', NOW)).toEqual([])
    })

    it('checks isSessionConfirmed against the speaker\'s own sessions', () => {
        const confirmed = speaker({
            sessions: [
                {
                    sessionizeSessionId: 'sess-1',
                    sessionTitle: 'My talk',
                    talkTopics: [],
                    status: 'Accepted',
                    isConfirmed: true,
                    foundInSessionize: true,
                },
            ],
        })
        expect(speakersMissingChecklistItem([confirmed], 'confirmSession', NOW)).toEqual([])

        const unconfirmed = speaker({
            sessions: [
                {
                    sessionizeSessionId: 'sess-1',
                    sessionTitle: 'My talk',
                    talkTopics: [],
                    status: 'Accepted',
                    isConfirmed: false,
                    foundInSessionize: true,
                },
            ],
        })
        expect(speakersMissingChecklistItem([unconfirmed], 'confirmSession', NOW)).toHaveLength(1)
    })
})
