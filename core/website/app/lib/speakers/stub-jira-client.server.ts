import type { JiraClient } from './jira-client.server'

/**
 * Fixture Jira client for local development — enabled with JIRA_STUB=true in
 * .dev.vars. "Sync now" cross-references these against whatever Sessionize
 * source is configured for the year (real endpoint or fixture), so the whole
 * speaker portal flow (login, view agenda slot, submit extra info,
 * write-back) can be exercised with no Jira account. The sessionize ids
 * below are real speaker ids from the live 2026 event (see
 * `.dev.vars` SESSIONIZE_2026_SESSIONS) — Quentin Qi + Ken Lin co-present one
 * session, Tanya Hallett presents solo, so a real sync exercises both the
 * co-presenter path and the single-speaker path.
 *
 * NOTE: as of writing, every real session is still status "Nominated" (CFP
 * hasn't concluded) — `portalAccessStatuses` in
 * `conference/config/speaker-portal.ts` only grants access for
 * Accepted/Waitlisted, so these fixture speakers won't actually get a
 * `speaker_contacts` row (and therefore no portal access) until either real
 * acceptances land, or you temporarily add 'Nominated' to
 * `portalAccessStatuses` for local testing (revert before it matters for
 * real).
 */
export function createStubJiraClient(): JiraClient {
    return {
        async searchSpeakerIssues() {
            return [
                { issueKey: 'SPK-101', sessionizeId: 'bc1c9b09-23c4-46a3-ba94-3bf6e1f74c62', email: 'quentin-qi@example.com' }, // Quentin Qi
                { issueKey: 'SPK-102', sessionizeId: 'cf675678-9f62-4c3a-97f0-ab095cc3f574', email: 'ken-lin@example.com' }, // Ken Lin — co-presents with Quentin
                { issueKey: 'SPK-103', sessionizeId: '1a708e4b-2642-4bbe-bc26-dfe277859308', email: 'tanya-hallett@example.com' }, // Tanya Hallett
            ]
        },

        async updateIssueFields(issueKey, fields) {
            console.log(`[jira-stub] updateIssueFields(${issueKey}, ${Object.keys(fields).join(', ')}) — no-op`)
        },
    }
}
