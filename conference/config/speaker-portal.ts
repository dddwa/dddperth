import { DateTime } from 'luxon'
import type { SpeakerPortalConfig } from '@ddd/conference-config'

/**
 * Speaker portal wiring for DDD Perth.
 *
 * Everything not sourced from Sessionize (who can log in as a given speaker,
 * plus the extra-info form) is stored directly in D1 — contacts are added
 * manually by an admin at /admin/speakers, and profile answers are entered
 * by the speaker themselves through the portal. There is no external sync
 * for either.
 */
export const speakerPortal: SpeakerPortalConfig = {
    year: '2026',
    // CFP has concluded — sessions are now genuinely Accepted or Waitlisted
    // (backup), so the sync no longer needs to pull every Nominated
    // submission in.
    portalAccessStatuses: ['Accepted', 'Waitlisted'],
    // Confirmed against the live 2026 event's Sessionize categories.
    sessionizeCategoryNames: {
        format: 'Session format',
        level: 'Level',
        generalTopic: 'General Topic Category',
        talkTopics: 'Talk Topics',
    },
    // Training session dates/times and the dinner below are confirmed.
    checklist: {
        // Ticket claim link is a secret, SPEAKER_TICKET_CLAIM_URL_<YEAR> —
        // see core/docs/runbooks/new-year.md.
        dueDates: {
            confirmSession: DateTime.fromISO('2026-08-21T17:00:00', { zone: 'Australia/Perth' }),
            acceptBackupSpeaker: DateTime.fromISO('2026-08-21T17:00:00', { zone: 'Australia/Perth' }),
            sessionDetails: DateTime.fromISO('2026-09-25T22:00:00', { zone: 'Australia/Perth' }),
            claimTicket: DateTime.fromISO('2026-09-11T22:00:00', { zone: 'Australia/Perth' }),
            speakerTraining: DateTime.fromISO('2026-08-28T22:00:00', { zone: 'Australia/Perth' }),
            speakerDinner: DateTime.fromISO('2026-09-25T17:00:00', { zone: 'Australia/Perth' }),
            meetTheExperts: DateTime.fromISO('2026-09-18T22:00:00', { zone: 'Australia/Perth' }),
        },
        speakerTrainingSessions: [
            {
                id: 'Session 1',
                title: 'Planning, building and writing your talk',
                dateTime: DateTime.fromISO('2026-09-02T17:30:00', { zone: 'Australia/Perth' }),
                endDateTime: DateTime.fromISO('2026-09-02T20:00:00', { zone: 'Australia/Perth' }),
            },
            {
                id: 'Session 2',
                title: 'Presentation skills, tips and tricks',
                dateTime: DateTime.fromISO('2026-09-09T17:30:00', { zone: 'Australia/Perth' }),
                endDateTime: DateTime.fromISO('2026-09-09T20:00:00', { zone: 'Australia/Perth' }),
            },
            {
                id: 'Session 3',
                title: 'Feedback and practice',
                dateTime: DateTime.fromISO('2026-09-23T17:30:00', { zone: 'Australia/Perth' }),
                endDateTime: DateTime.fromISO('2026-09-23T20:00:00', { zone: 'Australia/Perth' }),
            },
        ],
        speakerDinner: {
            dateTime: DateTime.fromISO('2026-10-02T18:00:00', { zone: 'Australia/Perth' }),
            endDateTime: DateTime.fromISO('2026-10-02T20:00:00', { zone: 'Australia/Perth' }),
        },
    },
    sessionConfirmationNotifyEmail: 'speakers@dddperth.com',
    speakerEmailAddress: 'speakers@dddperth.com',
}
