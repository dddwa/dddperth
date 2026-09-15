import { z } from 'zod'

/**
 * Reads the volunteer run sheet out of Jira for the public `/runsheets` page.
 *
 * The page is anonymous, so everything here runs on behalf of committee
 * credentials for a caller we know nothing about. Two consequences shape this
 * module:
 *
 * - **Nothing from the URL reaches JQL as text.** The filter is parsed into a
 *   closed set of known labels first (see `parseRunsheetFilter`); an unknown
 *   value becomes `null` and the query runs unfiltered rather than embedding
 *   whatever was in the path.
 * - **Responses are cached.** Without it, every page load costs two
 *   authenticated Jira calls, so a busy conference morning could exhaust the
 *   API budget on the one day the run sheet has to work.
 */

const JIRA_BASE = 'https://dddperth.atlassian.net'

/** Jira "Volunteer Team" label -> display name. */
export const TEAM_LABELS: Record<string, string> = {
    'team-1': 'Team 1',
    'team-2': 'Team 2',
    'team-3': 'Team 3',
    'team-4': 'Team 4',
    'team-5': 'Team 5',
    'team-6': 'Team 6',
    'team-7': 'Team 7',
    'team-photographers': 'Photographers',
    'team-Sat-Bump-Out': 'Bump Out',
}

/** Jira "Location" label -> display name. */
export const LOCATION_LABELS: Record<string, string> = {
    'loc-black-swan-room': 'Black Swan Room',
    'loc-champions-terrace': 'Champions Terrace',
    'loc-cygnet-room': 'Cygnet Room',
    'loc-help-desk': 'Help Desk Level 3',
    'loc-L2-Lobby': 'Lobby Level 2',
    'loc-L3-lobby': 'Lobby Level 3',
    'loc-platinum-terrace': 'Platinum Terrace',
    'loc-premiership-terrace': 'Premiership Terrace',
    'loc-registration-area': 'Registration Area',
    'loc-river-view-room-1': 'River View Room 1',
    'loc-river-view-room-2': 'River View Room 2',
    'loc-river-view-room-3': 'River View Room 3',
    'loc-sports-lounge': 'Sports Lounge',
}

/**
 * Custom field ids on the VOL project's "Run Sheet Item" type. Jira's REST API
 * only speaks these ids, so they are named once here rather than at each use.
 */
const FIELDS = {
    roleInstructions: 'customfield_10131',
    team: 'customfield_10132',
    endTime: 'customfield_10133',
    startTime: 'customfield_10134',
    location: 'customfield_10135',
    timeBracket: 'customfield_10136',
} as const

/**
 * Only the fields the page renders. Jira returns far more per issue —
 * including reporter and assignee details — and this response is serialised
 * to an anonymous client, so the schema is the boundary that keeps the rest
 * of it off the page. `.strip()` (Zod's default) drops anything unlisted.
 */
const issueSchema = z.object({
    id: z.string(),
    fields: z.object({
        summary: z.string(),
        [FIELDS.roleInstructions]: z.string().nullable(),
        [FIELDS.team]: z.array(z.string()).nullable(),
        [FIELDS.endTime]: z.string().nullable(),
        [FIELDS.startTime]: z.string().nullable(),
        [FIELDS.location]: z.array(z.string()).nullable(),
    }),
})

const searchResponseSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
})

const bulkResponseSchema = z.object({
    issues: z.array(issueSchema),
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
    /** Confluence URL for role instructions. Publicly shared, so safe to render. */
    roleInstructionsUrl: string | null
}

export type RunsheetFilter = { kind: 'team' | 'location'; value: string }

/**
 * Parses the `$filter` path param into a known team or location, or null.
 *
 * This is the trust boundary for the page: the param is attacker-controlled,
 * and its value is the only thing that varies the JQL. Anything that isn't
 * `team.<known-label>` or `location.<known-label>` returns null, so an
 * unrecognised filter renders the unfiltered run sheet instead of reaching
 * the query.
 */
export function parseRunsheetFilter(filter: string | undefined): RunsheetFilter | null {
    if (!filter) return null

    const separator = filter.indexOf('.')
    if (separator === -1) return null

    const kind = filter.slice(0, separator)
    const value = filter.slice(separator + 1)

    if (kind === 'team' && Object.hasOwn(TEAM_LABELS, value)) {
        return { kind, value }
    }
    if (kind === 'location' && Object.hasOwn(LOCATION_LABELS, value)) {
        return { kind, value }
    }
    return null
}

/**
 * Builds the JQL for the run sheet.
 *
 * `filter.value` is interpolated, but only ever after `parseRunsheetFilter`
 * has matched it against `TEAM_LABELS`/`LOCATION_LABELS` — it is one of a
 * fixed set of literals, never caller text. Callers must not pass a filter
 * built any other way.
 */
function buildJql(filter: RunsheetFilter | null): string {
    let jql = 'project = VOL AND type = "Run Sheet Item" AND "Time Bracket[Dropdown]" = "Saturday Conference"'
    if (filter?.kind === 'team') {
        jql += ` AND "Volunteer Team[Labels]" = ${filter.value}`
    } else if (filter?.kind === 'location') {
        jql += ` AND "Location[Labels]" = ${filter.value}`
    }
    return jql
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
    authEmail: string
    authToken: string
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
    authEmail,
    authToken,
    filter,
    cacheTtlSeconds,
}: FetchRunsheetOptions): Promise<RunsheetItem[]> {
    if (!authEmail || !authToken) {
        throw new Error('Jira API credentials are not configured')
    }
    const authorization = `Basic ${btoa(`${authEmail}:${authToken}`)}`

    const searchUrl = new URL('/rest/api/3/search/jql', JIRA_BASE)
    searchUrl.searchParams.set('jql', buildJql(filter))
    searchUrl.searchParams.set('maxResults', '150')
    searchUrl.searchParams.set('fields', 'id')

    const searchBody = await jiraFetch(searchUrl.toString(), authorization, { method: 'GET' }, cacheTtlSeconds)
    const issueIds = searchResponseSchema.parse(searchBody).issues.map((issue) => issue.id)

    if (issueIds.length === 0) {
        return []
    }

    const bulkBody = JSON.stringify({
        fields: [FIELDS.startTime, FIELDS.endTime, FIELDS.location, FIELDS.team, FIELDS.roleInstructions, 'summary'],
        fieldsByKeys: false,
        issueIdsOrKeys: issueIds,
        properties: [],
    })

    const bulkResponse = await jiraFetch(
        new URL('/rest/api/3/issue/bulkfetch', JIRA_BASE).toString(),
        authorization,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bulkBody },
        cacheTtlSeconds,
    )

    const issues = bulkResponseSchema.parse(bulkResponse).issues

    return issues
        .map(
            (issue): RunsheetItem => ({
                id: issue.id,
                summary: issue.fields.summary,
                startTime: issue.fields[FIELDS.startTime],
                endTime: issue.fields[FIELDS.endTime],
                locations: (issue.fields[FIELDS.location] ?? []).map(
                    (label) => LOCATION_LABELS[label] ?? label,
                ),
                teams: (issue.fields[FIELDS.team] ?? []).map((label) => TEAM_LABELS[label] ?? label),
                roleInstructionsUrl: issue.fields[FIELDS.roleInstructions],
            }),
        )
        .sort((a, b) => {
            // Items with no start time sort last rather than disappearing.
            if (a.startTime === null && b.startTime === null) return 0
            if (a.startTime === null) return 1
            if (b.startTime === null) return -1
            return a.startTime.localeCompare(b.startTime)
        })
}
