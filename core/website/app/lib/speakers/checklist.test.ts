import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import type { SpeakerProfile } from '../services/speakers-store'
import {
    dueDateRemainingLabel,
    isBackupAccepted,
    isBackupSpeaker,
    isMeetTheExpertsApplicable,
    isMeetTheExpertsRegistrationComplete,
    isSessionConfirmed,
    isSessionDetailsComplete,
    isSpeakerDinnerRsvpComplete,
    isSpeakerTrainingRsvpComplete,
    isTicketClaimed,
    speakerChecklist,
    upcomingRsvpedEvents,
    urgencyFor,
    type SpeakerSessionChecklistInput,
} from './checklist'
import { SPEAKER_CHECKLIST_ITEMS, checklistDueDate } from './checklist-items'

const NOW = DateTime.fromISO('2026-08-20T09:00:00', { zone: 'Australia/Perth' })

function profile(overrides: Partial<SpeakerProfile> = {}): SpeakerProfile {
    return {
        sessionizeId: 'spk-1',
        introductionUseSessionizeBio: true,
        rsvpSpeakerTraining: [],
        ...overrides,
    }
}

function session(overrides: Partial<SpeakerSessionChecklistInput> = {}): SpeakerSessionChecklistInput {
    return { status: 'Accepted', isConfirmed: false, sessionDetailsComplete: true, backupAccepted: false, ...overrides }
}

describe('isSessionDetailsComplete', () => {
    it('requires every session to have its shared details filled in and a resolved introduction', () => {
        expect(isSessionDetailsComplete(profile(), [session()])).toBe(true)
        expect(isSessionDetailsComplete(profile(), [session({ sessionDetailsComplete: false })])).toBe(false)
        expect(isSessionDetailsComplete(profile(), [])).toBe(false)
        expect(isSessionDetailsComplete(null, [session()])).toBe(false)
    })

    it('is not done unless every session (not just some) has its details filled in', () => {
        expect(isSessionDetailsComplete(profile(), [session(), session({ sessionDetailsComplete: false })])).toBe(false)
    })

    it('accepts a custom introduction in place of the Sessionize bio', () => {
        const custom = profile({ introductionUseSessionizeBio: false, introductionCustomText: 'Hi, I am...' })
        expect(isSessionDetailsComplete(custom, [session()])).toBe(true)

        const missing = profile({ introductionUseSessionizeBio: false, introductionCustomText: undefined })
        expect(isSessionDetailsComplete(missing, [session()])).toBe(false)
    })
})

describe('isMeetTheExpertsApplicable', () => {
    it('is true only once the speaker has opted in with Yes/Maybe/Other', () => {
        expect(isMeetTheExpertsApplicable(profile({ registerMeetTheExperts: 'Yes' }))).toBe(true)
        expect(isMeetTheExpertsApplicable(profile({ registerMeetTheExperts: 'Maybe' }))).toBe(true)
        expect(isMeetTheExpertsApplicable(profile({ registerMeetTheExperts: 'Other' }))).toBe(true)
        expect(isMeetTheExpertsApplicable(profile({ registerMeetTheExperts: 'No' }))).toBe(false)
        expect(isMeetTheExpertsApplicable(profile())).toBe(false)
        expect(isMeetTheExpertsApplicable(null)).toBe(false)
    })
})

describe('isMeetTheExpertsRegistrationComplete', () => {
    it('is done once the registration has been submitted at all, even with zero slots selected', () => {
        expect(isMeetTheExpertsRegistrationComplete(undefined)).toBe(false)
        expect(isMeetTheExpertsRegistrationComplete(1700000000)).toBe(true)
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
    const accepted = (isConfirmed: boolean): SpeakerSessionChecklistInput => session({ status: 'Accepted', isConfirmed })

    it('is not done with no sessions at all', () => {
        expect(isSessionConfirmed(profile(), [])).toBe(false)
    })

    it('is not done while waitlisted — nothing to confirm yet', () => {
        expect(isSessionConfirmed(profile(), [session({ status: 'Waitlisted', isConfirmed: false })])).toBe(false)
    })

    it('is done once every accepted session is confirmed in Sessionize', () => {
        expect(isSessionConfirmed(profile(), [accepted(true)])).toBe(true)
        expect(isSessionConfirmed(profile(), [accepted(true), accepted(false)])).toBe(false)
    })

    it('is done via the self-report flag even if the sync has not caught up', () => {
        expect(isSessionConfirmed(profile({ sessionConfirmedReportedAt: 1700000000 }), [accepted(false)])).toBe(true)
    })
})

describe('isBackupSpeaker', () => {
    it('is false with no sessions at all', () => {
        expect(isBackupSpeaker([])).toBe(false)
    })

    it('is true when every session is non-Accepted', () => {
        expect(isBackupSpeaker([session({ status: 'Waitlisted' })])).toBe(true)
    })

    it('is false once at least one session is Accepted', () => {
        expect(isBackupSpeaker([session({ status: 'Accepted' })])).toBe(false)
        expect(isBackupSpeaker([session({ status: 'Accepted' }), session({ status: 'Waitlisted' })])).toBe(false)
    })
})

describe('isBackupAccepted', () => {
    it('is not done with no backup sessions at all', () => {
        expect(isBackupAccepted([])).toBe(false)
        expect(isBackupAccepted([session({ status: 'Accepted' })])).toBe(false)
    })

    it('is done once every non-Accepted session has been accepted', () => {
        expect(isBackupAccepted([session({ status: 'Waitlisted', backupAccepted: false })])).toBe(false)
        expect(isBackupAccepted([session({ status: 'Waitlisted', backupAccepted: true })])).toBe(true)
        expect(
            isBackupAccepted([
                session({ status: 'Waitlisted', backupAccepted: true }),
                session({ status: 'Waitlisted', backupAccepted: false }),
            ]),
        ).toBe(false)
    })

    it('counts a co-presenter accepting on a shared session — session-level, not speaker-level', () => {
        // backupAccepted is set on the session itself regardless of which
        // presenter submitted it, so this speaker's own view of a session a
        // co-presenter already accepted just reads true.
        expect(isBackupAccepted([session({ status: 'Waitlisted', backupAccepted: true })])).toBe(true)
    })
})

describe('speakerChecklist', () => {
    it('handles a missing profile — everything outstanding', () => {
        expect(speakerChecklist(null, [], false, NOW).every((i) => !i.done)).toBe(true)
    })

    it('omits meetTheExperts until the speaker opts in', () => {
        expect(speakerChecklist(null, [], false, NOW).some((i) => i.key === 'meetTheExperts')).toBe(false)
        expect(
            speakerChecklist(profile({ registerMeetTheExperts: 'No' }), [], false, NOW).some((i) => i.key === 'meetTheExperts'),
        ).toBe(false)
        expect(
            speakerChecklist(profile({ registerMeetTheExperts: 'Yes' }), [], false, NOW).some((i) => i.key === 'meetTheExperts'),
        ).toBe(true)
    })

    it('reflects the passed-in meetTheExpertsResponded flag, not profile data', () => {
        const withProfile = profile({ registerMeetTheExperts: 'Yes' })
        expect(
            speakerChecklist(withProfile, [], false, NOW).find((i) => i.key === 'meetTheExperts')?.done,
        ).toBe(false)
        expect(
            speakerChecklist(withProfile, [], true, NOW).find((i) => i.key === 'meetTheExperts')?.done,
        ).toBe(true)
    })

    it('swaps confirmSession for acceptBackupSpeaker when the speaker has no Accepted session', () => {
        const notBackup = speakerChecklist(profile(), [session({ status: 'Accepted' })], false, NOW)
        expect(notBackup.some((i) => i.key === 'confirmSession')).toBe(true)
        expect(notBackup.some((i) => i.key === 'acceptBackupSpeaker')).toBe(false)

        const backup = speakerChecklist(profile(), [session({ status: 'Waitlisted' })], false, NOW)
        expect(backup.some((i) => i.key === 'confirmSession')).toBe(false)
        expect(backup.some((i) => i.key === 'acceptBackupSpeaker')).toBe(true)

        const acceptedItem = backup.find((i) => i.key === 'acceptBackupSpeaker')
        expect(acceptedItem?.done).toBe(false)
        const done = speakerChecklist(
            profile(),
            [session({ status: 'Waitlisted', backupAccepted: true })],
            false,
            NOW,
        )
        expect(done.find((i) => i.key === 'acceptBackupSpeaker')?.done).toBe(true)
    })

    it("carries each item's configured due date through as an ISO string", () => {
        const items = speakerChecklist(profile({ registerMeetTheExperts: 'Yes' }), [], false, NOW)
        for (const definition of SPEAKER_CHECKLIST_ITEMS) {
            const item = items.find((i) => i.key === definition.key)
            if (!item) continue // filtered out in this scenario, e.g. acceptBackupSpeaker (not a backup speaker)
            expect(item.dueDateIso).toBe(checklistDueDate(definition.key)?.toISO())
        }
    })

    it('reflects a fully complete profile, including meetTheExperts', () => {
        const complete = profile({
            rsvpSpeakerTrainingRespondedAt: 1700000000,
            rsvpSpeakersDinner: 'Yes',
            ticketClaimedAt: 1700000000,
            registerMeetTheExperts: 'Yes',
        })
        const sessions: SpeakerSessionChecklistInput[] = [session({ status: 'Accepted', isConfirmed: true })]
        expect(speakerChecklist(complete, sessions, true, NOW).every((i) => i.done)).toBe(true)
    })

    it('flags isPastDue only once an item\'s own due date has actually passed', () => {
        expect(speakerChecklist(null, [], false, NOW).every((i) => !i.isPastDue)).toBe(true)

        const confirmSessionDueDate = checklistDueDate('confirmSession')
        if (!confirmSessionDueDate) throw new Error('confirmSession is expected to have a due date')
        const items = speakerChecklist(null, [], false, confirmSessionDueDate.plus({ minutes: 1 }))
        expect(items.find((i) => i.key === 'confirmSession')?.isPastDue).toBe(true)
        // sessionDetails is due later than confirmSession, so it isn't past due yet.
        expect(items.find((i) => i.key === 'sessionDetails')?.isPastDue).toBe(false)
    })
})

describe('urgencyFor', () => {
    it('is normal with no due date or when far away', () => {
        expect(urgencyFor(undefined, false, NOW)).toBe('normal')
        expect(urgencyFor(NOW.plus({ days: 30 }).toISO() ?? undefined, false, NOW)).toBe('normal')
    })

    it('is upcoming when due within a week', () => {
        expect(urgencyFor(NOW.plus({ days: 5 }).toISO() ?? undefined, false, NOW)).toBe('upcoming')
    })

    it('is overdue when due within a day or already past', () => {
        expect(urgencyFor(NOW.plus({ hours: 12 }).toISO() ?? undefined, false, NOW)).toBe('overdue')
        expect(urgencyFor(NOW.minus({ days: 2 }).toISO() ?? undefined, false, NOW)).toBe('overdue')
    })

    it('ignores urgency once the item is done', () => {
        expect(urgencyFor(NOW.minus({ days: 2 }).toISO() ?? undefined, true, NOW)).toBe('normal')
    })
})

describe('dueDateRemainingLabel', () => {
    it('returns null with no due date', () => {
        expect(dueDateRemainingLabel(undefined, NOW)).toBeNull()
    })

    it('counts whole days left, rounding to the nearest day', () => {
        expect(dueDateRemainingLabel(NOW.plus({ days: 5 }).toISO() ?? undefined, NOW)).toBe('5 days left')
        expect(dueDateRemainingLabel(NOW.plus({ days: 1 }).toISO() ?? undefined, NOW)).toBe('1 day left')
    })

    it('says "Due today" within half a day either side', () => {
        expect(dueDateRemainingLabel(NOW.plus({ hours: 6 }).toISO() ?? undefined, NOW)).toBe('Due today')
        expect(dueDateRemainingLabel(NOW.minus({ hours: 6 }).toISO() ?? undefined, NOW)).toBe('Due today')
    })

    it('counts whole days overdue once it has passed', () => {
        expect(dueDateRemainingLabel(NOW.minus({ days: 3 }).toISO() ?? undefined, NOW)).toBe('Overdue by 3 days')
        expect(dueDateRemainingLabel(NOW.minus({ days: 1 }).toISO() ?? undefined, NOW)).toBe('Overdue by 1 day')
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
