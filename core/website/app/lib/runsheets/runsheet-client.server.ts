import type { RunsheetsConfig } from '@ddd/conference-config'
import { z } from 'zod'

/**
 * Reads a volunteer run sheet out of Jira for the public `/runsheets` page.
 *
 * Everything site-specific — the Jira base URL, the JQL, the custom field ids
 * and the team/location label vocabulary — is fork config, passed in as
 * `RunsheetsConfig`. This module is only the mechanism.
 *
 * The page is anonymous, so everything here runs on behalf of committee
 * credentials for a caller we know nothing about. Two consequences shape it:
 *
 * - **Nothing from the URL reaches JQL as text.** The filter is parsed into a
 *   closed set of configured labels first (see `parseRunsheetFilter`); an
 *   unknown value becomes `null` and the query runs unfiltered rather than
 *   embedding whatever was in the path.
 * - **Responses are cached.** Without it, every page load costs two
 *   authenticated Jira calls, so a busy conference morning could exhaust the
 *   API budget on the one day the run sheet has to work.
 */

/**
 * Only the fields the page renders. Jira returns far more per issue —
 * including reporter and assignee details — and this response is serialised
 * to an anonymous client, so this schema is the boundary that keeps the rest
 * of it off the page. Built per-request because the field ids are config.
 *
 * `z.looseObject` on `fields` keeps the configured custom field ids (which
 * aren't known statically) while the explicit entries below pin the ones the
 * page actually reads.
 */
function buildBulkResponseSchema(fields: RunsheetsConfig['jira']['fields']) {
    // The custom field ids are config, so they can't be named as static keys.
    // `summary` is, and is declared separately from the catch-all so it keeps
    // its `string` type rather than widening to the record's value union.
    const issueSchema = z.object({
        id: z.string(),
        fields: z.intersection(
            z.object({ summary: z.string() }),
            z.record(z.string(), z.union([z.string(), z.array(z.string())]).nullable().optional()),
        ),
    })
    return z.object({ issues: z.array(issueSchema) })
}

const searchResponseSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
})

/** One run sheet row, already mapped to display values. */
export interface RunsheetItem {
    id: string
    summary: string
    /** ISO datetime from Jira, or null. Formatted for display in the route. */
    startTime: string | null
    endTime: string | null
    /** Display names, falling back to the raw label when unmapped. */
    locations: string[]
    teams: string[]
    /** Role instructions URL. Publicly shared, so safe to render. */
    roleInstructionsUrl: string | null
}

export type RunsheetFilter = { kind: 'team' | 'location'; value: string }

/**
 * Parses the `$filter` path param into a known team or location, or null.
 *
 * This is the trust boundary for the page: the param is attacker-controlled,
 * and its value is the only thing that varies the JQL. Anything that isn't
 * `team.<configured-label>` or `location.<configured-label>` returns null, so
 * an unrecognised filter renders the unfiltered run sheet instead of reaching
 * the query.
 */
export function parseRunsheetFilter(
    filter: string | undefined,
    config: Pick<RunsheetsConfig, 'teamLabels' | 'locationLabels'>,
): RunsheetFilter | null {
    if (!filter) return null

    const separator = filter.indexOf('.')
    if (separator === -1) return null

    const kind = filter.slice(0, separator)
    const value = filter.slice(separator + 1)

    if (kind === 'team' && Object.hasOwn(config.teamLabels, value)) {
        return { kind, value }
    }
    if (kind === 'location' && Object.hasOwn(config.locationLabels, value)) {
        return { kind, value }
    }
    return null
}

/**
 * Appends the filter clause to the fork's configured JQL.
 *
 * `filter.value` is interpolated, but only ever after `parseRunsheetFilter`
 * has matched it against the configured label maps — it is one of a fixed set
 * of literals, never caller text. Callers must not pass a filter built any
 * other way.
 */
function buildJql(baseJql: string, filter: RunsheetFilter | null): string {
    if (filter?.kind === 'team') {
        return `${baseJql} AND "Volunteer Team[Labels]" = ${filter.value}`
    }
    if (filter?.kind === 'location') {
        return `${baseJql} AND "Location[Labels]" = ${filter.value}`
    }
    return baseJql
}

async function jiraFetch(
    url: string,
    authorization: string,
    init: RequestInit,
    cacheTtlSeconds: number,
): Promise<unknown> {
    // Cache key must capture the request body too — the bulk fetch POSTs a
    // different issue list per filter to the same URL. A named cache keeps
    // these entries away from the public zone cache; they hold committee data
    // and are only ever read back by this module.
    const cache = await caches.open('jira-runsheets')
    const cacheKey = `${url}#${typeof init.body === 'string' ? init.body : ''}`

    const cached = await cache.match(cacheKey)
    if (cached) {
        return await cached.json()
    }

    const res = await fetch(url, {
        ...init,
        headers: { ...init.headers, Authorization: authorization, Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
        // The body can echo the JQL, which names internal fields — keep it out
        // of the error that surfaces on a public page.
        throw new Error(`Jira responded with ${res.status}`)
    }

    const body: unknown = await res.json()
    await cache.put(
        cacheKey,
        new Response(JSON.stringify(body), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${cacheTtlSeconds}` },
        }),
    )
    return body
}

export interface FetchRunsheetOptions {
    config: RunsheetsConfig
    /** Service-account email for Jira Basic auth (`config.jira.apiEmail`). */
    apiEmail: string | undefined
    apiToken: string | undefined
    /**
     * REST base override. Scoped API tokens authenticate only via the
     * api.atlassian.com gateway, not the site URL — same override the sponsor
     * portal's client takes. Defaults to the fork's configured site.
     */
    apiBaseUrl?: string
    filter: RunsheetFilter | null
    /** How long to cache Jira's responses. Short on conference day. */
    cacheTtlSeconds: number
}

/**
 * Fetches the run sheet: a JQL search for matching issue ids, then a bulk
 * fetch for their fields. Returns an empty array when nothing matches —
 * a team with nothing scheduled is a normal result, not an error.
 */
export async function fetchRunsheet({
    config,
    apiEmail,
    apiToken,
    apiBaseUrl,
    filter,
    cacheTtlSeconds,
}: FetchRunsheetOptions): Promise<RunsheetItem[]> {
    if (!apiEmail || !apiToken) {
        throw new Error('Jira API credentials are not configured')
    }
    const authorization = `Basic ${btoa(`${apiEmail}:${apiToken}`)}`
    const { fields } = config.jira
    const baseUrl = apiBaseUrl ?? config.jira.baseUrl

    // NOT `new URL(path, baseUrl)` — that drops the base's own path, which is
    // fatal for the scoped-token gateway base
    // (https://api.atlassian.com/ex/jira/<cloudId>): the cloudId prefix would
    // be stripped and every call would 404. Same reasoning as the sponsor
    // portal's jira-client.server.ts.
    const joinUrl = (path: string) => `${baseUrl.replace(/\/$/, '')}${path}`

    const searchParams = new URLSearchParams({
        jql: buildJql(config.jira.jql, filter),
        maxResults: '150',
        fields: 'id',
    })

    const searchBody = await jiraFetch(
        joinUrl(`/rest/api/3/search/jql?${searchParams.toString()}`),
        authorization,
        { method: 'GET' },
        cacheTtlSeconds,
    )
    const issueIds = searchResponseSchema.parse(searchBody).issues.map((issue) => issue.id)

    if (issueIds.length === 0) {
        return []
    }

    const bulkBody = JSON.stringify({
        fields: [fields.startTime, fields.endTime, fields.location, fields.team, fields.roleInstructions, 'summary'],
        fieldsByKeys: false,
        issueIdsOrKeys: issueIds,
        properties: [],
    })

    const bulkResponse = await jiraFetch(
        joinUrl('/rest/api/3/issue/bulkfetch'),
        authorization,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bulkBody },
        cacheTtlSeconds,
    )

    const issues = buildBulkResponseSchema(fields).parse(bulkResponse).issues

    return issues
        .map((issue): RunsheetItem => {
            // Field ids are config, so these come back as `unknown` from the
            // loose schema — narrow each to the shape the page renders.
            const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null)
            const asLabels = (value: unknown): string[] =>
                Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

            return {
                id: issue.id,
                summary: issue.fields.summary,
                startTime: asString(issue.fields[fields.startTime]),
                endTime: asString(issue.fields[fields.endTime]),
                locations: asLabels(issue.fields[fields.location]).map(
                    (label) => config.locationLabels[label] ?? label,
                ),
                teams: asLabels(issue.fields[fields.team]).map((label) => config.teamLabels[label] ?? label),
                roleInstructionsUrl: asString(issue.fields[fields.roleInstructions]),
            }
        })
        .sort((a, b) => {
            // Items with no start time sort last rather than disappearing.
            if (a.startTime === null && b.startTime === null) return 0
            if (a.startTime === null) return 1
            if (b.startTime === null) return -1
            return a.startTime.localeCompare(b.startTime)
        })
}
