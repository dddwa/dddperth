import type { SpeakerPortalConfig } from '@ddd/conference-config'

/**
 * Speaker portal wiring for DDD Perth's Jira (dddperth.atlassian.net).
 *
 * Committee conventions this config relies on:
 *   - Each speaker has a "Speaker" issue in the SPK project, labelled with
 *     the conference year (e.g. `2026`), created and maintained manually —
 *     this app only ever searches and updates these issues, never creates
 *     them.
 *   - "Sessionize ID" holds the speaker's Sessionize speaker id (visible via
 *     the organiser's Sessionize dashboard) — the join key sync matches
 *     issues on. A speaker only gets portal access once both Sessionize
 *     (accepted/waitlisted session) and this Jira issue (with an email)
 *     agree on that id.
 *   - "Email" holds the single address that can log into the portal for
 *     that speaker.
 *
 * TODO: the SPK project and these field ids don't exist yet — this is a
 * placeholder shape to unblock the sync code. Create the project + issue
 * type in Jira, then update baseUrl/projectKey/jql/fields below (inspect via
 * the Jira admin UI or `GET /rest/api/3/issue/createmeta`).
 */
export const speakerPortal: SpeakerPortalConfig = {
    year: '2026',
    // TODO: Remove nominated
    portalAccessStatuses: ['Accepted', 'Waitlisted', 'Nominated'],
    jira: {
        baseUrl: 'https://dddperth.atlassian.net',
        projectKey: 'SPK',
        jql: 'project = SPK AND issuetype = Speaker AND labels = "{year}"',
        fields: {
            sessionizeId: 'customfield_TBD_sessionizeId',
            email: 'customfield_TBD_email',
            namePhoneticSpelling: 'customfield_TBD_namePhonetic',
            questionsPreference: 'customfield_TBD_questionsPreference',
            presentationDetails: 'customfield_TBD_presentationDetails',
            optOutOfRecording: 'customfield_TBD_optOutRecording',
            introduction: 'customfield_TBD_introduction',
            anythingElse: 'customfield_TBD_anythingElse',
            dietaryRequirements: 'customfield_TBD_dietary',
            rsvpSpeakersDinner: 'customfield_TBD_rsvpDinner',
            rsvpSpeakerTraining: 'customfield_TBD_rsvpTraining',
            registerMeetTheExperts: 'customfield_TBD_meetExperts',
        },
    },
    // Confirmed against the live 2026 event's Sessionize categories.
    sessionizeCategoryNames: {
        format: 'Session format',
        level: 'Level',
        generalTopic: 'General Topic Category',
        talkTopics: 'Talk Topics',
    },
}
