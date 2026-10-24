import { conferenceTime } from './dates.ts'
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
            confirmSession: conferenceTime('2026-08-21T17:00:00'),
            acceptBackupSpeaker: conferenceTime('2026-08-21T17:00:00'),
            claimTicket: conferenceTime('2026-09-11T22:00:00'),
            meetTheExperts: conferenceTime('2026-09-18T22:00:00'),
            speakerTraining: conferenceTime('2026-08-28T22:00:00'),
            speakerDinner: conferenceTime('2026-09-25T17:00:00'),
            // Deliberately later than confirmSession — the checklist's
            // past-due logic is per-item, and the tests rely on this ordering.
            sessionDetails: conferenceTime('2026-09-25T22:00:00'),
        },
        speakerTrainingSessions: [
            {
                id: 'Session 1',
                title: 'Planning, building and writing your talk',
                dateTime: conferenceTime('2026-09-02T17:30:00'),
                endDateTime: conferenceTime('2026-09-02T20:00:00'),
            },
            {
                id: 'Session 2',
                title: 'Presentation skills, tips and tricks',
                dateTime: conferenceTime('2026-09-09T17:30:00'),
                endDateTime: conferenceTime('2026-09-09T20:00:00'),
            },
        ],
        speakerDinner: {
            dateTime: conferenceTime('2026-10-16T18:00:00'),
            endDateTime: conferenceTime('2026-10-16T20:00:00'),
        },
    },
    sessionConfirmationNotifyEmail: 'speakers@example.test',
    speakerEmailAddress: 'speakers@example.test',
}
