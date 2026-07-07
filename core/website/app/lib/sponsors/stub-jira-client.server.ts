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
                    website: 'https://acme.example.com',
                    jiraStatus: 'Committed',
                    contactEmails: ['sponsor-acme@example.com', 'marketing-acme@example.com'],
                },
                {
                    issueKey: 'SPN-102',
                    companyName: 'Globex Corporation',
                    tier: 'Gold',
                    jiraStatus: 'Committed',
                    contactEmails: ['sponsor-globex@example.com'],
                },
                {
                    issueKey: 'SPN-103',
                    companyName: 'Initech',
                    tier: 'Digital',
                    website: 'https://initech.example.com',
                    jiraStatus: 'Invoiced',
                    contactEmails: ['sponsor-initech@example.com'],
                },
            ]
        },

        async getSponsorTaskOptionIds(issueKey) {
            console.log(`[jira-stub] getSponsorTaskOptionIds(${issueKey}) -> []`)
            return []
        },

        async setSponsorTaskOptionIds(issueKey, optionIds) {
            console.log(`[jira-stub] setSponsorTaskOptionIds(${issueKey}, [${optionIds.join(', ')}]) — no-op`)
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
