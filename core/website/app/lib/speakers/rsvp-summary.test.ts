import { describe, expect, it } from 'vitest'
import type { SpeakerProfile } from '../services/speakers-store'
import { buildRsvpHeadcount } from './rsvp-summary'

function profile(overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
    return {
        sessionizeId: 'sp-1',
        introductionUseSessionizeBio: true,
        registerMeetTheExpertsSlots: [],
        rsvpSpeakerTraining: [],
        meetTheExpertsBioUseSessionizeBio: true,
        ...overrides,
    }
}

const TRAINING_SESSIONS = [
    { id: 'Session 1', title: 'Planning' },
    { id: 'Session 2', title: 'Presentation skills' },
]

describe('buildRsvpHeadcount', () => {
    it('counts nothing when no speakers have profiles yet', () => {
        const headcount = buildRsvpHeadcount([null, null], TRAINING_SESSIONS)
        expect(headcount.totalSpeakers).toBe(2)
        expect(headcount.training.respondedCount).toBe(0)
        expect(headcount.training.notRespondedCount).toBe(2)
        expect(headcount.training.notAttendingAnyCount).toBe(0)
        expect(headcount.training.sessions).toEqual([
            { id: 'Session 1', title: 'Planning', attendingCount: 0 },
            { id: 'Session 2', title: 'Presentation skills', attendingCount: 0 },
        ])
        expect(headcount.dinner).toEqual({
            yesCount: 0,
            noCount: 0,
            maybeCount: 0,
            respondedCount: 0,
            notRespondedCount: 2,
        })
    })

    it('splits an explicit "not attending any" from not-yet-responded', () => {
        const respondedNone = profile({
            rsvpSpeakerTraining: [],
            rsvpSpeakerTrainingRespondedAt: 1234,
        })
        const respondedSome = profile({
            rsvpSpeakerTraining: ['Session 1'],
            rsvpSpeakerTrainingRespondedAt: 1234,
        })
        const neverResponded = profile({ rsvpSpeakerTraining: [] })

        const headcount = buildRsvpHeadcount([respondedNone, respondedSome, neverResponded], TRAINING_SESSIONS)

        expect(headcount.training.respondedCount).toBe(2)
        expect(headcount.training.notAttendingAnyCount).toBe(1)
        expect(headcount.training.notRespondedCount).toBe(1)
        expect(headcount.training.sessions.find((s) => s.id === 'Session 1')?.attendingCount).toBe(1)
        expect(headcount.training.sessions.find((s) => s.id === 'Session 2')?.attendingCount).toBe(0)
    })

    it('counts a dinner "No" as a completed response, distinct from not-yet-responded', () => {
        const yes = profile({ rsvpSpeakersDinner: 'Yes' })
        const no = profile({ rsvpSpeakersDinner: 'No' })
        const maybe = profile({ rsvpSpeakersDinner: 'Maybe' })
        const unanswered = profile({})

        const headcount = buildRsvpHeadcount([yes, no, maybe, unanswered], [])

        expect(headcount.dinner).toEqual({
            yesCount: 1,
            noCount: 1,
            maybeCount: 1,
            respondedCount: 3,
            notRespondedCount: 1,
        })
    })
})
