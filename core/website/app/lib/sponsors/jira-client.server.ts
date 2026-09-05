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
    /** Current option id on the issue's assets status single-select, if set. */
    getAssetsStatusOptionId(issueKey: string): Promise<string | undefined>
    /** Sets the assets status single-select to one option. */
    setAssetsStatusOptionId(issueKey: string, optionId: string): Promise<void>
    /** Adds a label without disturbing the issue's existing labels. */
    addLabel(issueKey: string, label: string): Promise<void>
    /**
     * Sponsor-supplied logistics per issue key, keyed by portal field name.
     * Empty when the manifest has no `fields.logistics` mapping.
     */
    getExhibitorLogistics(): Promise<Map<string, ExhibitorLogistics>>
    /**
     * Writes sponsor-supplied logistics back, converting each value to the
     * shape its Jira field expects (select, multi-checkbox, rich text or
     * plain string). Unmapped fields are skipped.
     */
    pushLogistics(issueKey: string, logistics: Record<string, string>): Promise<void>
    /** Posts a plain-text comment (shows in the activity feed, notifies watchers). */
    addComment(issueKey: string, text: string): Promise<void>
    /** Attaches a file to the issue (shows in the Attachments panel). */
    addAttachment(issueKey: string, filename: string, content: ArrayBuffer, contentType: string): Promise<void>
    /** Sets issue fields verbatim (used to push sponsor-owned values). */
    updateIssueFields(issueKey: string, fields: Record<string, unknown>): Promise<void>
}

/**
 * Sponsor-supplied logistics read back from Jira, keyed by the portal's own
 * field names (see LOGISTICS_KEYS) so callers never deal in customfield ids.
 */
export type ExhibitorLogistics = Record<string, string>

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

/** Single-selects come back as `{ id: "10202", value: … }`. */
function fieldOptionId(fields: Record<string, unknown>, fieldId: string): string | undefined {
    const value = fields[fieldId]
    if (value && typeof value === 'object' && 'id' in value) {
        return String(value.id)
    }
    return undefined
}

/** Reads a field as text regardless of its Jira type (string, select,
 * checkbox, ADF) — the committee changes field types. */
function fieldAsText(fields: Record<string, unknown>, fieldId: string | undefined): string | undefined {
    if (!fieldId) return undefined
    const value = fields[fieldId]
    if (value === null || value === undefined) return undefined

    if (typeof value === 'string') return value.trim() || undefined
    if (typeof value === 'number' || typeof value === 'boolean') return String(value)

    // Multi-checkbox / multi-select: join the ticked options.
    if (Array.isArray(value)) {
        const parts = value
            .map((item) =>
                item && typeof item === 'object' && 'value' in item ? String((item as { value: unknown }).value) : null,
            )
            .filter((part): part is string => part !== null && part.trim() !== '')
        return parts.length > 0 ? parts.join(', ') : undefined
    }

    if (typeof value === 'object') {
        // Single-select.
        if ('value' in value && typeof value.value === 'string') {
            return value.value.trim() || undefined
        }
        // Rich text (ADF): flatten every text node.
        if ('type' in value && value.type === 'doc') {
            const texts: string[] = []
            const walk = (node: unknown): void => {
                if (!node || typeof node !== 'object') return
                const n = node as { text?: unknown; content?: unknown }
                if (typeof n.text === 'string') texts.push(n.text)
                if (Array.isArray(n.content)) n.content.forEach(walk)
            }
            walk(value)
            const joined = texts.join(' ').trim()
            return joined || undefined
        }
    }

    return undefined
}

/** Resolves an answer to an allowed option, by id or case-insensitive value.
 * Returns null if nothing matches — Jira rejects unknown options and would
 * fail the whole save, so we drop the one answer instead. */
function matchOption(allowedValues: unknown[] | undefined, answer: string): { id: string } | null {
    if (!answer || !Array.isArray(allowedValues)) return null

    for (const option of allowedValues) {
        if (!option || typeof option !== 'object') continue
        const { id, value } = option as { id?: unknown; value?: unknown }
        if (typeof id !== 'string' && typeof id !== 'number') continue
        const optionId = String(id)

        if (optionId === answer) return { id: optionId }
        if (typeof value === 'string' && value.trim().toLowerCase() === answer.toLowerCase()) {
            return { id: optionId }
        }
    }
    return null
}

/** Jira's rich-text fields need ADF; plain text fields reject it. */
function isRichText(fieldMeta: { schema?: { type?: string; custom?: string } }): boolean {
    return typeof fieldMeta.schema?.custom === 'string' && fieldMeta.schema.custom.includes('textarea')
}

const YEAR_LABEL = /^\d{4}$/

/** The ten years before `year` as a quoted JQL list, for `{pastYears}`. */
export function pastYearsList(year: string): string {
    const current = Number(year)
    if (!Number.isFinite(current)) return '"0000"'
    const years: string[] = []
    for (let y = current - 10; y < current; y++) years.push(`"${y}"`)
    return years.join(', ')
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
            const jql = (jqlOverride ?? portalConfig.jira.jql)
                .replaceAll('{year}', portalConfig.year)
                .replaceAll('{pastYears}', pastYearsList(portalConfig.year))
            const requestFields = [
                'summary',
                'status',
                'labels',
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

                    const labels = Array.isArray(issueFields.labels)
                        ? issueFields.labels.filter((l): l is string => typeof l === 'string')
                        : []

                    issues.push({
                        issueKey: issue.key,
                        companyName: fieldString(issueFields, fields.companyName) ?? summary ?? issue.key,
                        tier: fieldOptionValue(issueFields, fields.tier) ?? 'Unknown',
                        website: fieldString(issueFields, fields.website),
                        jiraStatus: typeof status?.name === 'string' ? status.name : undefined,
                        hasYearLabel: labels.some((l) => YEAR_LABEL.test(l)),
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

        async getAssetsStatusOptionId(issueKey) {
            const response = await jiraFetch(
                `/rest/api/3/issue/${encodeURIComponent(issueKey)}?fields=${fields.assetsStatus}`,
            )
            const body = await parseJson<{ fields?: Record<string, unknown> }>(response)
            return fieldOptionId(body.fields ?? {}, fields.assetsStatus)
        },

        async setAssetsStatusOptionId(issueKey, optionId) {
            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
                method: 'PUT',
                body: JSON.stringify({
                    fields: { [fields.assetsStatus]: { id: optionId } },
                }),
            })
        },

        async getExhibitorLogistics() {
            const map = new Map<string, ExhibitorLogistics>()
            const exhibitor = fields.logistics
            if (!exhibitor) return map

            const requestFields = Object.values(exhibitor).filter(
                (id): id is string => typeof id === 'string' && id !== '',
            )
            if (requestFields.length === 0) return map

            // Same result set as the sync, so the spreadsheet covers exactly
            // the sponsors the portal knows about — no more, no less.
            const jql = (jqlOverride ?? portalConfig.jira.jql)
                .replaceAll('{year}', portalConfig.year)
                .replaceAll('{pastYears}', pastYearsList(portalConfig.year))

            let nextPageToken: string | undefined
            do {
                const response = await jiraFetch('/rest/api/3/search/jql', {
                    method: 'POST',
                    body: JSON.stringify({ jql, fields: requestFields, maxResults: 100, nextPageToken }),
                })
                const page = await parseJson<JiraSearchResponse>(response)

                for (const issue of page.issues ?? []) {
                    const issueFields = issue.fields ?? {}
                    const entry: ExhibitorLogistics = {}
                    for (const [portalKey, fieldId] of Object.entries(exhibitor)) {
                        const text = fieldAsText(issueFields, fieldId)
                        if (text !== undefined) entry[portalKey] = text
                    }
                    map.set(issue.key, entry)
                }

                nextPageToken = page.isLast ? undefined : page.nextPageToken
            } while (nextPageToken)

            return map
        },

        async pushLogistics(issueKey, logistics) {
            const mapping = fields.logistics
            if (!mapping) return

            const entries = Object.entries(mapping).filter(
                (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '',
            )
            if (entries.length === 0) return

            // Ask what type each field is rather than assuming: Jira rejects
            // a plain string for a select, and field types do change.
            const metaResponse = await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}/editmeta`)
            const meta = await parseJson<{
                fields?: Record<
                    string,
                    { schema?: { type?: string; items?: string; custom?: string }; allowedValues?: unknown[] }
                >
            }>(metaResponse)

            const payload: Record<string, unknown> = {}
            for (const [portalKey, fieldId] of entries) {
                const raw = logistics[portalKey]
                const fieldMeta = meta.fields?.[fieldId]
                // Not on the screen (or no permission) — writing it would 400
                // the request and lose every other answer.
                if (!fieldMeta) continue

                const type = fieldMeta.schema?.type
                const value = raw?.trim() ?? ''

                if (type === 'option') {
                    payload[fieldId] = value ? matchOption(fieldMeta.allowedValues, value) : null
                } else if (type === 'array') {
                    payload[fieldId] = value
                        ? value
                              .split(',')
                              .map((part) => matchOption(fieldMeta.allowedValues, part.trim()))
                              .filter((option) => option !== null)
                        : []
                } else if (type === 'string' && isRichText(fieldMeta)) {
                    payload[fieldId] = value ? textToAdf(value) : null
                } else {
                    payload[fieldId] = value || null
                }
            }

            if (Object.keys(payload).length > 0) {
                await this.updateIssueFields(issueKey, payload)
            }
        },

        async addLabel(issueKey, label) {
            // `update` rather than `fields` — an additive op, so a label
            // added in Jira between our read and this write isn't clobbered.
            await jiraFetch(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, {
                method: 'PUT',
                body: JSON.stringify({ update: { labels: [{ add: label }] } }),
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
