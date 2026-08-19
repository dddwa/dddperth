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
    // Checklist due dates live in
    // core/website/app/lib/speakers/checklist-items.ts; training session
    // dates/times and the dinner below are confirmed.
    checklist: {
        ticketClaimUrl: 'https://ti.to/dddperth/2026/with/speaker',
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
        // TODO: confirm exact Meet-the-Experts slot boundaries — placeholder
        // six ~55-min blocks spanning the stated 10:30am-4pm window.
        meetTheExpertsSlots: [
            { id: 'slot-1', label: '10:30am – 11:25am' },
            { id: 'slot-2', label: '11:25am – 12:20pm' },
            { id: 'slot-3', label: '12:20pm – 1:15pm' },
            { id: 'slot-4', label: '1:15pm – 2:10pm' },
            { id: 'slot-5', label: '2:10pm – 3:05pm' },
            { id: 'slot-6', label: '3:05pm – 4:00pm' },
        ],
    },
    sessionConfirmationNotifyEmail: 'speakers@dddperth.com',
}
