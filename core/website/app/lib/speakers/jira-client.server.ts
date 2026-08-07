import type { SpeakerPortalConfig } from '@ddd/conference-config'
import type { SyncSourceSpeakerContact } from './sync-plan'

/**
 * The slice of Jira the speaker portal needs. Unlike the sponsor client,
 * this never creates or ticks anything — speaker issues are created and
 * maintained manually (same convention as sponsors), and this app only
 * reads them (for email + the sessionize id join key) and pushes the
 * extra-info fields a speaker submits through the portal. The real
 * implementation talks to Jira Cloud REST v3; a fixture stub
 * (stub-jira-client.server.ts) swaps in behind JIRA_STUB=true for local dev.
 */
export interface JiraClient {
    /** This year's speaker issues, parsed via the manifest's field mapping. */
    searchSpeakerIssues(): Promise<SyncSourceSpeakerContact[]>
    /** Sets issue fields verbatim (used to push the speaker's submitted extra info). */
    updateIssueFields(issueKey: string, fields: Record<string, unknown>): Promise<void>
}

interface JiraSearchResponse {
    issues?: Array<{
        key: string
        fields?: Record<string, unknown>
    }>
    nextPageToken?: string
    isLast?: boolean
}

async function parseJson<T>(response: Response): Promise<T> {
    const body: unknown = await response.json()
    return body as T
}

function fieldString(fields: Record<string, unknown>, fieldId: string): string | undefined {
    const value = fields[fieldId]
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined
}

export function createJiraClient(args: {
    portalConfig: SpeakerPortalConfig
    apiEmail: string
    apiToken: string
    /** Replaces the manifest JQL (test envs scope to "portal-test" issues). */
    jqlOverride?: string
    /** REST base override — scoped API tokens must use the api.atlassian.com
     * gateway rather than the site URL. Defaults to the site baseUrl. */
    apiBaseUrl?: string
}): JiraClient {
    const { portalConfig, apiEmail, apiToken, jqlOverride } = args
    const { fields } = portalConfig.jira
    const baseUrl = args.apiBaseUrl ?? portalConfig.jira.baseUrl

    const authHeader = `Basic ${btoa(`${apiEmail}:${apiToken}`)}`

    // NOT `new URL(path, baseUrl)` — that drops the base's own path, which
    // is fatal for the scoped-token gateway base
    // (https://api.atlassian.com/ex/jira/<cloudId>): the cloudId prefix
    // would be stripped and every call would 404.
    const joinUrl = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

    async function jiraFetch(path: string, init?: RequestInit): Promise<Response> {
        const response = await fetch(joinUrl(path), {
            ...init,
            headers: {
                Authorization: authHeader,
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...init?.headers,
            },
        })
        if (!response.ok) {
            const body = await response.text().catch(() => '')
            throw new Error(`Jira ${init?.method ?? 'GET'} ${path} failed: ${response.status} ${body.slice(0, 300)}`)
        }
        return response
    }

    return {
        async searchSpeakerIssues() {
            const jql = (jqlOverride ?? portalConfig.jira.jql).replaceAll('{year}', portalConfig.year)
            const requestFields = [fields.sessionizeId, fields.email]

            const issues: SyncSourceSpeakerContact[] = []
            let nextPageToken: string | undefined

            do {
                const response = await jiraFetch('/rest/api/3/search/jql', {
                    method: 'POST',
                    body: JSON.stringify({ jql, fields: requestFields, maxResults: 100, nextPageToken }),
                })
                const page = await parseJson<JiraSearchResponse>(response)

                for (const issue of page.issues ?? []) {
                    const issueFields = issue.fields ?? {}
                    const sessionizeId = fieldString(issueFields, fields.sessionizeId)
                    const email = fieldString(issueFields, fields.email)
                    // An issue without both fields filled in can't be matched
                    // to a Sessionize speaker or grant access — skip it
                    // rather than fail the whole sync over one incomplete
                    // issue.
                    if (!sessionizeId || !email) continue

                    issues.push({ issueKey: issue.key, sessionizeId, email: email.toLowerCase() })
                }

                nextPageToken = page.isLast ? undefined : page.nextPageToken
            } while (nextPageToken)

            return issues
        },

        async updateIssueFields(issueKey, fieldValues) {
            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
                method: 'PUT',
                body: JSON.stringify({ fields: fieldValues }),
            })
        },
    }
}
