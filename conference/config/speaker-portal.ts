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
    // Due dates, training sessions, the dinner, the ticket claim link and
    // Meet the Experts slots change every year, so they're set by an admin at
    // /admin/settings/speakers (stored in D1) rather than here.
    sessionConfirmationNotifyEmail: 'speakers@dddperth.com',
    speakerEmailAddress: 'speakers@dddperth.com',
}
