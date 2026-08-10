import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { SpeakerProfile } from '../services/speakers-store'
import {
    isSessionDetailsComplete,
    isSpeakerTrainingRsvpComplete,
    isTicketClaimed,
    speakerChecklist,
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

describe('speakerChecklist', () => {
    it('handles a missing profile — everything outstanding', () => {
        expect(speakerChecklist(null).every((i) => !i.done)).toBe(true)
    })

    it('carries due dates through as ISO strings', () => {
        const dueDate = DateTime.fromISO('2026-09-05T23:59:59', { zone: 'Australia/Perth' })
        const items = speakerChecklist(null, { sessionDetails: dueDate })
        expect(items.find((i) => i.key === 'sessionDetails')?.dueDateIso).toBe(dueDate.toISO())
        expect(items.find((i) => i.key === 'claimTicket')?.dueDateIso).toBeUndefined()
    })

    it('reflects a fully complete profile', () => {
        const complete = profile({
            rsvpSpeakerTraining: ['Session 1'],
            ticketClaimedAt: 1700000000,
        })
        expect(speakerChecklist(complete).every((i) => i.done)).toBe(true)
    })
})
