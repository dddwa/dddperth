import type { SponsorPortalConfig } from '@ddd/conference-config'

/**
 * Sponsor portal wiring for DDD Perth's Jira (dddperth.atlassian.net).
 *
 * Committee conventions this config relies on:
 *   - Each sponsorship is a "Sponsor" issue in the SPN project, labelled
 *     with the conference year (e.g. `2026`).
 *   - "Contact Email" holds comma/semicolon-separated addresses; those
 *     people can log into the portal for that sponsor. "Additional Sponsor
 *     Portal Emails" takes the same format and grants the same access —
 *     use it when the extra logins shouldn't clutter the primary contact.
 *   - When a sponsor finishes uploading their assets, the portal ticks
 *     "Assets for Conference" under "Sponsor Tasks" on their issue.
 *   - Test issues live on the same board with a `portal-test` label. This
 *     JQL excludes them; test environments override the whole query via the
 *     JIRA_SYNC_JQL var to select ONLY portal-test issues (see
 *     core/website/SPONSOR_PORTAL_SETUP.md).
 *
 * Field/option ids come from the SPN project's Sponsor issue type — inspect
 * via the Jira admin UI or `GET /rest/api/3/issue/createmeta` if they change.
 */
export const sponsorPortal: SponsorPortalConfig = {
    year: '2026',
    jira: {
        baseUrl: 'https://dddperth.atlassian.net',
        projectKey: 'SPN',
        jql: 'project = SPN AND issuetype = Sponsor AND labels = "{year}" AND labels NOT IN ("portal-test")',
        fields: {
            companyName: 'customfield_10087',
            website: 'customfield_10089',
            contactEmail: 'customfield_10091',
            additionalContactEmails: 'customfield_10147',
            tier: 'customfield_10086',
            sponsorTasks: 'customfield_10096',
            quote: 'customfield_10140',
            socials: {
                linkedin: 'customfield_10141',
                twitter: 'customfield_10142',
                instagram: 'customfield_10143',
                facebook: 'customfield_10144',
                youtube: 'customfield_10145',
            },
        },
        assetsTaskOptionId: '10078',
        tierMap: {
            Platinum: 'platinum',
            Gold: 'gold',
            Room: 'room',
            Coffee: 'coffeeCart',
            Digital: 'digital',
            Community: 'community',
        },
    },
}
