import type { JiraClient } from './jira-client.server'

/**
 * Fixture Jira client for local development — enabled with JIRA_STUB=true in
 * .dev.vars. "Sync now" pulls these sponsors into local D1 so the whole
 * portal flow (login as a fixture contact, upload, complete, write-back) can
 * be exercised with no Jira account. Write-backs log to the console instead
 * of touching anything.
 *
 * See SPONSOR_PORTAL_SETUP.md for the local dev walkthrough.
 */
export function createStubJiraClient(): JiraClient {
    return {
        async searchSponsorIssues() {
            return [
                {
                    issueKey: 'SPN-101',
                    companyName: 'Acme Rockets',
                    tier: 'Platinum',
                    // Exercises the "Your room" card and the admin Room column.
                    exhibitorRoom: 'River View Room 2',
                    website: 'https://acme.example.com',
                    jiraStatus: 'Committed',
                    contactEmails: ['sponsor-acme@example.com', 'marketing-acme@example.com'],
                    hasYearLabel: true,
                },
                {
                    // Answered the sponsorship team by email before the
                    // portal existed, so the committee already has their
                    // quote and socials in Jira — exercises the prefill path.
                    issueKey: 'SPN-102',
                    companyName: 'Globex Corporation',
                    tier: 'Gold',
                    jiraStatus: 'Committed',
                    contactEmails: ['sponsor-globex@example.com'],
                    hasYearLabel: true,
                    quote: 'Globex is proud to back the local tech community.',
                    socials: { linkedin: 'https://linkedin.com/company/globex' },
                    // Committee-collected logistics, so the local flow walks
                    // the prefill path. Later stub syncs restore these fixture
                    // values just as a real Jira sync refreshes the portal copy.
                    logistics: {
                        bumpInSlot: 'Friday 1pm - 2pm',
                        screenOrders: '55" LCD ($500+GST)',
                        socialQuote: 'Globex: proud supporters of the Perth tech community.',
                    },
                },
                {
                    // Deliberately unlabelled — exercises the year-label
                    // stamping path locally (logs, doesn't write).
                    issueKey: 'SPN-103',
                    companyName: 'Initech',
                    tier: 'Digital',
                    website: 'https://initech.example.com',
                    jiraStatus: 'Invoiced',
                    contactEmails: ['sponsor-initech@example.com'],
                    hasYearLabel: false,
                },
            ]
        },

        async getStatusOptionId(issueKey, fieldId) {
            // Undefined = status unset, which counts as "pending" — so the
            // local flow takes the branch where the portal moves it, without
            // core needing to know any fork's option ids.
            console.log(`[jira-stub] getStatusOptionId(${issueKey}, ${fieldId}) -> undefined`)
            return undefined
        },

        async setStatusOptionId(issueKey, fieldId, optionId) {
            console.log(`[jira-stub] setStatusOptionId(${issueKey}, ${fieldId}, ${optionId}) — no-op`)
        },

        async getSponsorDeliverables(issueKey) {
            // Enough for the dashboard's tickets and assets sections to render
            // locally without a Jira connection.
            console.log(`[jira-stub] getSponsorDeliverables(${issueKey})`)
            return {
                freeTicketCount: '4',
                ticketClaimUrl: 'https://ti.to/example/stub-sponsor-tickets',
                assetsRequired: 'Logo and blurb on Website (All types), Video for Mega Screen (Platinum, Gold)',
                assetUploadUrl: 'https://example.sharepoint.com/stub-sponsor-uploads',
                // Only the Room sponsor has one. Returning a room for every
                // issue made the local dashboard show Acme's room to Globex,
                // and hid the unassigned case that `assignedRoom()` exists to
                // protect — so the fixture could never surface a bug there.
                exhibitorRoom: issueKey === 'SPN-101' ? 'River View Room 2' : undefined,
            }
        },

        async getAssetTracking() {
            // One sponsor per state the follow-up list distinguishes: assets
            // received, video owed and not yet in, and nothing recorded.
            const video = 'Logo and blurb on Website (All types), Video for Mega Screen (Platinum, Gold)'
            return new Map([
                [
                    'SPN-101',
                    {
                        assetsRequired: video,
                        assetsStatus: 'All Assets received',
                        uploadUrl: 'https://example.sharepoint.com/stub-sponsor-uploads/acme',
                    },
                ],
                ['SPN-102', { assetsRequired: video, assetsStatus: 'Asset Information Pending (Sponsor)' }],
            ])
        },

        async pushLogistics(issueKey, logistics, submittedKeys) {
            const answered = Object.entries(logistics).filter(([, value]) => value.trim() !== '')
            const cleared = [...submittedKeys].filter((key) => !logistics[key])
            console.log(
                `[jira-stub] pushLogistics(${issueKey}, ${answered.length} answered, ` +
                    `${cleared.length} explicitly cleared) — no-op`,
            )
        },

        async addLabel(issueKey, label) {
            console.log(`[jira-stub] addLabel(${issueKey}, ${label}) — no-op`)
        },

        async getExhibitorLogistics() {
            // Enough shape to exercise the spreadsheet export locally: one
            // fully-populated exhibitor, one with only a contact, and one
            // absent entirely (the export must still emit its row).
            return new Map<string, Record<string, string>>([
                [
                    'SPN-101',
                    {
                        exhibitorContactName: 'Wile E. Coyote',
                        exhibitorContactPhone: '0400 000 000',
                        exhibitorContactEmail: 'logistics-acme@example.com',
                        bumpInSlot: 'Friday 1pm - 2pm',
                        bumpOutWindow: 'Saturday 5pm (after conference concludes)',
                        parking: 'For Bump In, For Bump Out',
                        equipmentList: '1x pop-up banner (5kg), 2x crates (20kg each)',
                        trolleyOrForklift: 'Trolley please',
                        loadingDockAssistance: 'Yes',
                        rafflePrize: 'Mechanical keyboard (~$250)',
                    },
                ],
                ['SPN-102', { exhibitorContactName: 'Hank Scorpio', exhibitorContactEmail: 'globex@example.com' }],
            ])
        },

        async addComment(issueKey, text) {
            console.log(`[jira-stub] addComment(${issueKey}): ${text}`)
        },

        async addAttachment(issueKey, filename, content) {
            console.log(`[jira-stub] addAttachment(${issueKey}, ${filename}, ${content.byteLength} bytes) — no-op`)
        },

        async updateIssueFields(issueKey, fields) {
            console.log(`[jira-stub] updateIssueFields(${issueKey}, ${Object.keys(fields).join(', ')}) — no-op`)
        },
    }
}
