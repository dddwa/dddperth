import type { SponsorPortalConfig } from '@ddd/conference-config'

/**
 * Sponsor portal wiring for DDD Perth's Jira (dddperth.atlassian.net).
 *
 * Committee conventions this config relies on:
 *   - Each sponsorship is a "Sponsor" issue in the SPN project. Issues are
 *     labelled with the conference year (e.g. `2026`), but the sync also
 *     picks up issues with no year label yet and stamps one on, so a new
 *     sponsor added mid-year is never silently missed. Tier labels
 *     (`Platinum`, `Gold`, …) sit alongside the year label.
 *   - "Contact Email" holds comma/semicolon-separated addresses; those
 *     people can log into the portal for that sponsor. "Additional Sponsor
 *     Portal Emails" takes the same format and grants the same access —
 *     use it when the extra logins shouldn't clutter the primary contact.
 *   - When a sponsor finishes uploading their assets, the portal moves
 *     "Asset Creation Status" to "Assets partially received, creation
 *     underway" — the website logo/blurb is only part of what a sponsor
 *     owes (screens, print, video), so this deliberately isn't the
 *     "All Assets received" value.
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
        // Current year OR not yet year-labelled. There's no JQL predicate for
        // "has a label shaped like a year", so this is expressed as "not
        // labelled with a PAST year" — `{pastYears}` expands to the years
        // before `year` as a quoted list. Tier labels ("Platinum", "Gold", …)
        // sit alongside year labels and are correctly ignored by both arms.
        // `writeYearLabel` stamps the missing label on during sync, so the
        // unlabelled arm self-heals and archiving stays a bulk label edit.
        jql:
            'project = SPN AND issuetype = Sponsor' +
            ' AND (labels = "{year}" OR labels IS EMPTY OR labels NOT IN ({pastYears}))' +
            ' AND labels NOT IN ("portal-test")',
        fields: {
            companyName: 'customfield_10087',
            website: 'customfield_10089',
            contactEmail: 'customfield_10091',
            additionalContactEmails: 'customfield_10147',
            tier: 'customfield_10086',
            assetsStatus: 'customfield_10205',
            quote: 'customfield_10140',
            socials: {
                linkedin: 'customfield_10141',
                twitter: 'customfield_10142',
                instagram: 'customfield_10143',
                facebook: 'customfield_10144',
                youtube: 'customfield_10145',
            },
            // Read-only, for the Optus Stadium exhibitor spreadsheet export
            // (Admin → Sponsors → Export exhibitor list). Committee-owned:
            // the portal never writes these.
            exhibitor: {
                contactName: 'customfield_10149',
                contactPhone: 'customfield_10150',
                contactEmail: 'customfield_10151',
                bumpInSlot: 'customfield_10153',
                bumpOutWindow: 'customfield_10154',
                parking: 'customfield_10159',
                equipmentList: 'customfield_10156',
                trolleyOrForklift: 'customfield_10160',
                loadingDockAssistance: 'customfield_10161',
                // The venue's "Additional Notes" has no dedicated Jira field;
                // the closest is the loading-dock attendee list, which is a
                // different question — left unmapped rather than mismapped.
            },
        },
        // "Asset Creation Status" → "Assets partially received, creation
        // underway (Design and Sponsor)". Not "All Assets received": the
        // portal only collects the website logo/blurb, while "Assets
        // Required" also covers screens, print, video and the treasure map.
        assetsCompleteOptionId: '10202',
        // "Asset Information Pending (Sponsor)" — the default. Anything past
        // this is the committee's own progress and the portal won't touch it.
        assetsPendingOptionIds: ['10201'],
        writeYearLabel: true,
        tierMap: {
            Platinum: 'platinum',
            Gold: 'gold',
            Room: 'room',
            Coffee: 'coffeeCart',
            Digital: 'digital',
            Community: 'community',
            // Raffle-only sponsors donate a prize and get no website
            // placement — this key intentionally matches no YearSponsors
            // category, so they sync and appear in the portal/admin list
            // without ever rendering on the public sponsors page.
            'Raffle Only': 'raffleOnly',
        },
    },
}
