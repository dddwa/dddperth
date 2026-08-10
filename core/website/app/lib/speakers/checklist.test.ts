import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { SpeakerProfile } from '../services/speakers-store'
import {
    isSessionConfirmed,
    isSessionDetailsComplete,
    isSpeakerDinnerRsvpComplete,
    isSpeakerTrainingRsvpComplete,
    isTicketClaimed,
    speakerChecklist,
    upcomingRsvpedEvents,
    type SessionConfirmationInput,
} from './checklist'

const NOW = DateTime.fromISO('2026-08-20T09:00:00', { zone: 'Australia/Perth' })

function profile(overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
    return {
        sessionizeId: 'spk-1',
        presentationDetails: [],
        optOutOfRecording: false,
        introductionUseSessionizeBio: true,
        rsvpSpeakerTraining: [],
        registerMeetTheExpertsSlots: [],
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
    it('is done once the RSVP has been submitted, even with zero sessions selected', () => {
        expect(isSpeakerTrainingRsvpComplete(profile())).toBe(false)
        expect(isSpeakerTrainingRsvpComplete(profile({ rsvpSpeakerTrainingRespondedAt: 1700000000 }))).toBe(true)
        expect(
            isSpeakerTrainingRsvpComplete(
                profile({ rsvpSpeakerTraining: ['Session 1'], rsvpSpeakerTrainingRespondedAt: 1700000000 }),
            ),
        ).toBe(true)
        expect(isSpeakerTrainingRsvpComplete(null)).toBe(false)
    })
})

describe('isSpeakerDinnerRsvpComplete', () => {
    it('is done once a Yes/No/Maybe answer is on file', () => {
        expect(isSpeakerDinnerRsvpComplete(profile())).toBe(false)
        expect(isSpeakerDinnerRsvpComplete(profile({ rsvpSpeakersDinner: 'No' }))).toBe(true)
        expect(isSpeakerDinnerRsvpComplete(null)).toBe(false)
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
        expect(speakerChecklist(null, [], {}, NOW).every((i) => !i.done)).toBe(true)
    })

    it('carries due dates through as ISO strings', () => {
        const dueDate = DateTime.fromISO('2026-09-05T23:59:59', { zone: 'Australia/Perth' })
        const items = speakerChecklist(null, [], { sessionDetails: dueDate }, NOW)
        expect(items.find((i) => i.key === 'sessionDetails')?.dueDateIso).toBe(dueDate.toISO())
        expect(items.find((i) => i.key === 'claimTicket')?.dueDateIso).toBeUndefined()
    })

    it('reflects a fully complete profile, including the new dinner item', () => {
        const complete = profile({
            rsvpSpeakerTrainingRespondedAt: 1700000000,
            rsvpSpeakersDinner: 'Yes',
            ticketClaimedAt: 1700000000,
        })
        const sessions: SessionConfirmationInput[] = [{ status: 'Accepted', isConfirmed: true }]
        expect(speakerChecklist(complete, sessions, {}, NOW).every((i) => i.done)).toBe(true)
    })

    describe('urgency', () => {
        it('is normal with no due date or when far away', () => {
            const farDueDate = NOW.plus({ days: 30 })
            const items = speakerChecklist(null, [], { sessionDetails: farDueDate }, NOW)
            expect(items.find((i) => i.key === 'sessionDetails')?.urgency).toBe('normal')
            expect(items.find((i) => i.key === 'claimTicket')?.urgency).toBe('normal')
        })

        it('is upcoming when due within a week', () => {
            const soonDueDate = NOW.plus({ days: 5 })
            const items = speakerChecklist(null, [], { sessionDetails: soonDueDate }, NOW)
            expect(items.find((i) => i.key === 'sessionDetails')?.urgency).toBe('upcoming')
        })

        it('is overdue when due within a day or already past', () => {
            const dueSoon = speakerChecklist(null, [], { sessionDetails: NOW.plus({ hours: 12 }) }, NOW)
            expect(dueSoon.find((i) => i.key === 'sessionDetails')?.urgency).toBe('overdue')

            const overdue = speakerChecklist(null, [], { sessionDetails: NOW.minus({ days: 2 }) }, NOW)
            expect(overdue.find((i) => i.key === 'sessionDetails')?.urgency).toBe('overdue')
        })

        it('ignores urgency once the item is done', () => {
            const complete = profile({ ticketClaimedAt: 1700000000 })
            const items = speakerChecklist(complete, [], { ticketClaim: NOW.minus({ days: 2 }) }, NOW)
            expect(items.find((i) => i.key === 'claimTicket')?.urgency).toBe('normal')
        })
    })
})

describe('upcomingRsvpedEvents', () => {
    const config = {
        speakerTrainingSessions: [
            {
                id: 'Session 1',
                title: 'Planning, building and writing your talk',
                dateTime: NOW.plus({ days: 3 }),
                endDateTime: NOW.plus({ days: 3, hours: 2 }),
            },
            {
                id: 'Session 2',
                title: 'Presentation skills, tips and tricks',
                dateTime: NOW.plus({ days: 20 }),
                endDateTime: NOW.plus({ days: 20, hours: 2 }),
            },
        ],
        speakerDinner: { dateTime: NOW.plus({ days: 6 }), endDateTime: NOW.plus({ days: 6, hours: 2 }) },
    }

    it('returns nothing for a missing profile', () => {
        expect(upcomingRsvpedEvents(null, config, NOW)).toEqual([])
    })

    it('includes selected training sessions within the next 7 days, sorted', () => {
        const p = profile({ rsvpSpeakerTraining: ['Session 1', 'Session 2'] })
        const events = upcomingRsvpedEvents(p, config, NOW)
        expect(events).toHaveLength(1)
        expect(events[0].label).toContain('Planning, building and writing your talk')
    })

    it('includes the dinner when RSVP is Yes or Maybe, but not No', () => {
        const yes = profile({ rsvpSpeakersDinner: 'Yes' })
        expect(upcomingRsvpedEvents(yes, config, NOW).some((e) => e.label === 'Speaker dinner')).toBe(true)

        const no = profile({ rsvpSpeakersDinner: 'No' })
        expect(upcomingRsvpedEvents(no, config, NOW).some((e) => e.label === 'Speaker dinner')).toBe(false)
    })

    it('excludes events further than 7 days out or already past', () => {
        const p = profile({ rsvpSpeakerTraining: ['Session 2'] })
        expect(upcomingRsvpedEvents(p, config, NOW)).toEqual([])
    })
})
