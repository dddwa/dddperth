import type { SponsorPortalConfig } from '@ddd/conference-config'
import type { SyncSourceSponsor } from './sync-plan'
import { parseContactEmails } from './sync-plan'

/**
 * The slice of Jira the sponsor portal needs. The real implementation talks
 * to Jira Cloud REST v3; a fixture stub (stub-jira-client.server.ts) swaps
 * in behind JIRA_STUB=true for local dev.
 */
export interface JiraClient {
    /** This year's sponsor issues, parsed via the manifest's field mapping. */
    searchSponsorIssues(): Promise<SyncSourceSponsor[]>
    /** Currently-ticked option ids on the issue's "Sponsor Tasks" checklist. */
    getSponsorTaskOptionIds(issueKey: string): Promise<string[]>
    /** Replaces the checklist's ticked options (callers pass existing + new). */
    setSponsorTaskOptionIds(issueKey: string, optionIds: string[]): Promise<void>
    /** Posts a plain-text comment (shows in the activity feed, notifies watchers). */
    addComment(issueKey: string, text: string): Promise<void>
    /** Attaches a file to the issue (shows in the Attachments panel). */
    addAttachment(issueKey: string, filename: string, content: ArrayBuffer, contentType: string): Promise<void>
    /** Sets issue fields verbatim (used to push sponsor-owned values). */
    updateIssueFields(issueKey: string, fields: Record<string, unknown>): Promise<void>
}

/** Wraps plain text (possibly multi-line) into the ADF document that REST v3
 * requires for paragraph/rich-text fields. */
export function textToAdf(text: string): object {
    return {
        type: 'doc',
        version: 1,
        content: text
            .split('\n')
            .filter((line) => line.trim() !== '')
            .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] })),
    }
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

/** Single-selects come back as `{ value: "Gold" }`. */
function fieldOptionValue(fields: Record<string, unknown>, fieldId: string): string | undefined {
    const value = fields[fieldId]
    if (value && typeof value === 'object' && 'value' in value && typeof value.value === 'string') {
        return value.value
    }
    return undefined
}

export function createJiraClient(args: {
    portalConfig: SponsorPortalConfig
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
        async searchSponsorIssues() {
            const jql = (jqlOverride ?? portalConfig.jira.jql).replaceAll('{year}', portalConfig.year)
            const requestFields = [
                'summary',
                'status',
                fields.companyName,
                fields.website,
                fields.contactEmail,
                fields.tier,
                ...(fields.additionalContactEmails ? [fields.additionalContactEmails] : []),
            ]

            const issues: SyncSourceSponsor[] = []
            let nextPageToken: string | undefined

            do {
                const response = await jiraFetch('/rest/api/3/search/jql', {
                    method: 'POST',
                    body: JSON.stringify({ jql, fields: requestFields, maxResults: 100, nextPageToken }),
                })
                const page = await parseJson<JiraSearchResponse>(response)

                for (const issue of page.issues ?? []) {
                    const issueFields = issue.fields ?? {}
                    const summary = fieldString(issueFields, 'summary')
                    const status = issueFields.status as { name?: string } | undefined

                    issues.push({
                        issueKey: issue.key,
                        companyName: fieldString(issueFields, fields.companyName) ?? summary ?? issue.key,
                        tier: fieldOptionValue(issueFields, fields.tier) ?? 'Unknown',
                        website: fieldString(issueFields, fields.website),
                        jiraStatus: typeof status?.name === 'string' ? status.name : undefined,
                        contactEmails: parseContactEmails(
                            fieldString(issueFields, fields.contactEmail),
                            fields.additionalContactEmails
                                ? fieldString(issueFields, fields.additionalContactEmails)
                                : undefined,
                        ),
                    })
                }

                nextPageToken = page.isLast ? undefined : page.nextPageToken
            } while (nextPageToken)

            return issues
        },

        async getSponsorTaskOptionIds(issueKey) {
            const response = await jiraFetch(
                `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${fields.sponsorTasks}`,
            )
            const body = await parseJson<{ fields?: Record<string, unknown> }>(response)
            const value = body.fields?.[fields.sponsorTasks]
            if (!Array.isArray(value)) return []
            return value
                .map((option) => (option && typeof option === 'object' && 'id' in option ? String(option.id) : null))
                .filter((id): id is string => id !== null)
        },

        async setSponsorTaskOptionIds(issueKey, optionIds) {
            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
                method: 'PUT',
                body: JSON.stringify({
                    fields: { [fields.sponsorTasks]: optionIds.map((id) => ({ id })) },
                }),
            })
        },

        async updateIssueFields(issueKey, fieldValues) {
            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
                method: 'PUT',
                body: JSON.stringify({ fields: fieldValues }),
            })
        },

        async addComment(issueKey, text) {
            // Each input line becomes an ADF paragraph — \n inside a text
            // node doesn't render as a line break in Jira.
            const paragraphs = text
                .split('\n')
                .filter((line) => line.trim() !== '')
                .map((line) => ({ type: 'paragraph', content: [{ type: 'text', text: line }] }))

            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/comment`, {
                method: 'POST',
                body: JSON.stringify({
                    body: { type: 'doc', version: 1, content: paragraphs },
                }),
            })
        },

        async addAttachment(issueKey, filename, content, contentType) {
            // Raw fetch, not jiraFetch: multipart needs fetch to set the
            // boundary Content-Type itself, and Jira requires the
            // XSRF-bypass header on attachment uploads.
            const form = new FormData()
            form.append('file', new Blob([content], { type: contentType }), filename)

            const response = await fetch(joinUrl(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/attachments`), {
                method: 'POST',
                headers: {
                    Authorization: authHeader,
                    Accept: 'application/json',
                    'X-Atlassian-Token': 'no-check',
                },
                body: form,
            })
            if (!response.ok) {
                const body = await response.text().catch(() => '')
                throw new Error(`Jira attachment upload to ${issueKey} failed: ${response.status} ${body.slice(0, 300)}`)
            }
        },
    }
}
