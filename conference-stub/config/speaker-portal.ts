import { DateTime } from 'luxon'
import type { SpeakerPortalConfig } from '@ddd/conference-config'

/**
 * Speaker portal wiring for DevConf Example.
 *
 * Present so `conference-stub` stays a complete reference implementation —
 * core owns the checklist *items*, a fork owns the calendar they're due on,
 * so without this the portal renders every item undated.
 *
 * Dates count back from the 2026-10-17 conference date in
 * `config/years/2026.ts`. Replace them with your own when forking.
 */
export const speakerPortal: SpeakerPortalConfig = {
    year: '2026',
    portalAccessStatuses: ['Accepted', 'Waitlisted'],
    // These must match the category names configured on your Sessionize event.
    sessionizeCategoryNames: {
        format: 'Session format',
        level: 'Level',
        generalTopic: 'General Topic Category',
        talkTopics: 'Talk Topics',
    },
    checklist: {
        // The ticket claim URL is deliberately absent — it's a secret,
        // SPEAKER_TICKET_CLAIM_URL_<YEAR>. See docs/runbooks/new-year.md.
        dueDates: {
            confirmSession: DateTime.fromISO('2026-08-21T17:00:00', { zone: 'Etc/UTC' }),
            acceptBackupSpeaker: DateTime.fromISO('2026-08-21T17:00:00', { zone: 'Etc/UTC' }),
            claimTicket: DateTime.fromISO('2026-09-11T22:00:00', { zone: 'Etc/UTC' }),
            meetTheExperts: DateTime.fromISO('2026-09-18T22:00:00', { zone: 'Etc/UTC' }),
            speakerTraining: DateTime.fromISO('2026-08-28T22:00:00', { zone: 'Etc/UTC' }),
            speakerDinner: DateTime.fromISO('2026-09-25T17:00:00', { zone: 'Etc/UTC' }),
            // Deliberately later than confirmSession — the checklist's
            // past-due logic is per-item, and the tests rely on this ordering.
            sessionDetails: DateTime.fromISO('2026-09-25T22:00:00', { zone: 'Etc/UTC' }),
        },
        speakerTrainingSessions: [
            {
                id: 'Session 1',
                title: 'Planning, building and writing your talk',
                dateTime: DateTime.fromISO('2026-09-02T17:30:00', { zone: 'Etc/UTC' }),
                endDateTime: DateTime.fromISO('2026-09-02T20:00:00', { zone: 'Etc/UTC' }),
            },
            {
                id: 'Session 2',
                title: 'Presentation skills, tips and tricks',
                dateTime: DateTime.fromISO('2026-09-09T17:30:00', { zone: 'Etc/UTC' }),
                endDateTime: DateTime.fromISO('2026-09-09T20:00:00', { zone: 'Etc/UTC' }),
            },
        ],
        speakerDinner: {
            dateTime: DateTime.fromISO('2026-10-16T18:00:00', { zone: 'Etc/UTC' }),
            endDateTime: DateTime.fromISO('2026-10-16T20:00:00', { zone: 'Etc/UTC' }),
        },
    },
    sessionConfirmationNotifyEmail: 'speakers@example.test',
    speakerEmailAddress: 'speakers@example.test',
}
