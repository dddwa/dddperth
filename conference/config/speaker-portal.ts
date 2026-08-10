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
    // TODO: confirm these due dates and set the real Tito ticket-claim link
    // with the speaker liaison team — placeholders spaced out before the
    // 3 Oct 2026 event so the checklist ships with something reasonable.
    checklist: {
        sessionDetailsDueDate: DateTime.fromISO('2026-09-05T23:59:59', { zone: 'Australia/Perth' }),
        ticketClaimDueDate: DateTime.fromISO('2026-09-12T23:59:59', { zone: 'Australia/Perth' }),
        speakerTrainingDueDate: DateTime.fromISO('2026-09-19T23:59:59', { zone: 'Australia/Perth' }),
    },
}
