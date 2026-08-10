import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { SpeakerProfile } from '../services/speakers-store'
import {
    isSessionConfirmed,
    isSessionDetailsComplete,
    isSpeakerTrainingRsvpComplete,
    isTicketClaimed,
    speakerChecklist,
    type SessionConfirmationInput,
} from './checklist'

function profile(overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
    return {
        sessionizeId: 'spk-1',
        presentationDetails: [],
        optOutOfRecording: false,
        introductionUseSessionizeBio: true,
        rsvpSpeakerTraining: [],
        questionsPreference: 'Yes',
        ...overrides,
    }
}

describe('isSessionDetailsComplete', () => {
    it('requires a questions preference and a resolved introduction', () => {
        expect(isSessionDetailsComplete(profile())).toBe(true)
        expect(isSessionDetailsComplete(profile({ questionsPreference: undefined }))).toBe(false)
        expect(isSessionDetailsComplete(null)).toBe(false)
    })

    it('accepts a custom introduction in place of the Sessionize bio', () => {
        const custom = profile({ introductionUseSessionizeBio: false, introductionCustomText: 'Hi, I am...' })
        expect(isSessionDetailsComplete(custom)).toBe(true)

        const missing = profile({ introductionUseSessionizeBio: false, introductionCustomText: undefined })
        expect(isSessionDetailsComplete(missing)).toBe(false)
    })
})

describe('isSpeakerTrainingRsvpComplete', () => {
    it('is done once any training option — including "Not attending" — is picked', () => {
        expect(isSpeakerTrainingRsvpComplete(profile())).toBe(false)
        expect(isSpeakerTrainingRsvpComplete(profile({ rsvpSpeakerTraining: ['Not attending'] }))).toBe(true)
        expect(isSpeakerTrainingRsvpComplete(profile({ rsvpSpeakerTraining: ['Session 1'] }))).toBe(true)
        expect(isSpeakerTrainingRsvpComplete(null)).toBe(false)
    })
})

describe('isTicketClaimed', () => {
    it('is done once ticketClaimedAt is stamped', () => {
        expect(isTicketClaimed(profile())).toBe(false)
        expect(isTicketClaimed(profile({ ticketClaimedAt: 1700000000 }))).toBe(true)
        expect(isTicketClaimed(null)).toBe(false)
    })
})

describe('isSessionConfirmed', () => {
    const accepted = (isConfirmed: boolean): SessionConfirmationInput => ({ status: 'Accepted', isConfirmed })

    it('is not done with no sessions at all', () => {
        expect(isSessionConfirmed(profile(), [])).toBe(false)
    })

    it('is not done while waitlisted — nothing to confirm yet', () => {
        expect(isSessionConfirmed(profile(), [{ status: 'Waitlisted', isConfirmed: false }])).toBe(false)
    })

    it('is done once every accepted session is confirmed in Sessionize', () => {
        expect(isSessionConfirmed(profile(), [accepted(true)])).toBe(true)
        expect(isSessionConfirmed(profile(), [accepted(true), accepted(false)])).toBe(false)
    })

    it('is done via the self-report flag even if the sync has not caught up', () => {
        expect(isSessionConfirmed(profile({ sessionConfirmedReportedAt: 1700000000 }), [accepted(false)])).toBe(true)
    })
})

describe('speakerChecklist', () => {
    it('handles a missing profile — everything outstanding', () => {
        expect(speakerChecklist(null, []).every((i) => !i.done)).toBe(true)
    })

    it('carries due dates through as ISO strings', () => {
        const dueDate = DateTime.fromISO('2026-09-05T23:59:59', { zone: 'Australia/Perth' })
        const items = speakerChecklist(null, [], { sessionDetails: dueDate })
        expect(items.find((i) => i.key === 'sessionDetails')?.dueDateIso).toBe(dueDate.toISO())
        expect(items.find((i) => i.key === 'claimTicket')?.dueDateIso).toBeUndefined()
    })

    it('reflects a fully complete profile', () => {
        const complete = profile({
            rsvpSpeakerTraining: ['Session 1'],
            ticketClaimedAt: 1700000000,
        })
        const sessions: SessionConfirmationInput[] = [{ status: 'Accepted', isConfirmed: true }]
        expect(speakerChecklist(complete, sessions).every((i) => i.done)).toBe(true)
    })
})
