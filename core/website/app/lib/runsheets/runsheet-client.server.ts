import type { RunsheetsConfig, sessionSchema } from '@ddd/conference-config'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { isBreakSummary, type RunsheetItem } from './runsheet-filters'

export type { RunsheetItem } from './runsheet-filters'

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
 * - **Nothing from the URL reaches Jira.** The query is always the fork's
 *   configured JQL for the whole run sheet; the page filters the result
 *   itself (see `runsheet-filters.ts`).
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
            z.record(
                z.string(),
                z
                    .union([z.string(), z.array(z.string())])
                    .nullable()
                    .optional(),
            ),
        ),
    })
    return z.object({ issues: z.array(issueSchema) })
}

const searchResponseSchema = z.object({
    issues: z.array(z.object({ id: z.string() })),
})

/**
 * A Jira item standing in for agenda sessions (one carrying the
 * `sessionTeam` label). It isn't shown itself — the agenda comes from
 * Sessionize — but its teams and role instructions are carried onto the
 * sessions it overlaps (see `sessionsToRunsheetItems`).
 */
export interface RunsheetPlaceholder {
    startTime: string | null
    endTime: string | null
    /** Raw Jira team labels, so they can be matched against the team filter. */
    teams: string[]
    roleInstructionsUrl: string | null
    /** Titled "[Break] …", which makes the service sessions it overlaps breaks. */
    isBreak?: boolean
}

/** The fields of a Sessionize session the run sheet renders. */
export type RunsheetSession = Pick<
    z.infer<typeof sessionSchema>,
    | 'id'
    | 'title'
    | 'description'
    | 'startsAt'
    | 'endsAt'
    | 'room'
    | 'speakers'
    | 'isServiceSession'
    | 'isPlenumSession'
>

/**
 * The Cache API key for a Jira request. Everything that should tell two
 * requests apart has to go in the query string, because the Cache API ignores
 * a URL's `#fragment` when matching:
 *
 * - the request body — the bulk fetch POSTs a different issue list to the
 *   same URL. Hashed, since the list can run to thousands of characters.
 * - the cache generation, which an admin refresh changes so every existing
 *   entry misses.
 *
 * Both used to be appended after a `#`, so every bulk fetch shared one entry
 * (a filtered run sheet got the unfiltered issues back) and the admin refresh
 * never invalidated anything.
 */
export async function jiraCacheKey(url: string, body: string | undefined, cacheGeneration = ''): Promise<string> {
    const params = new URLSearchParams()
    if (cacheGeneration) params.set('__generation', cacheGeneration)
    if (body) {
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
        params.set('__body', [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join(''))
    }
    const extra = params.toString()
    return extra ? `${url}${url.includes('?') ? '&' : '?'}${extra}` : url
}

/**
 * When a cached response actually came from Jira — the page shows it as
 * "last updated", which would otherwise claim a cached answer is fresh.
 */
const FETCHED_AT_HEADER = 'X-Fetched-At'

/**
 * A Jira REST call through the run sheet cache. `cacheGeneration` is part of
 * the key, so bumping it (the admin refresh) makes every existing entry miss.
 */
export async function jiraFetch(
    url: string,
    authorization: string,
    init: RequestInit,
    cacheTtlSeconds: number,
    cacheGeneration: string,
): Promise<{ body: unknown; fetchedAt: string }> {
    // A named cache keeps these entries away from the public zone cache; they
    // hold committee data and are only ever read back by this module.
    const cache = await caches.open('jira-runsheets')
    const cacheKey = await jiraCacheKey(url, typeof init.body === 'string' ? init.body : undefined, cacheGeneration)

    const cached = await cache.match(cacheKey)
    if (cached) {
        return {
            body: await cached.json(),
            fetchedAt: cached.headers.get(FETCHED_AT_HEADER) ?? new Date().toISOString(),
        }
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
    const fetchedAt = new Date().toISOString()
    await cache.put(
        cacheKey,
        new Response(JSON.stringify(body), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': `max-age=${cacheTtlSeconds}`,
                [FETCHED_AT_HEADER]: fetchedAt,
            },
        }),
    )
    return { body, fetchedAt }
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
    /** Replaces `config.jira.jql`, e.g. to read the bump-in items instead of the day's. */
    jql?: string
    /** How long to cache Jira's responses. Short on conference day. */
    cacheTtlSeconds: number
    /** From `getRunsheetCacheGeneration`; changes when an admin refreshes. */
    cacheGeneration: string
    /** The conference's IANA timezone, for ordering items by start time. */
    timezone: string
}

/** Basic auth header for the committee's Jira service account. */
export function jiraAuthorization(apiEmail: string | undefined, apiToken: string | undefined): string {
    if (!apiEmail || !apiToken) {
        throw new Error('Jira API credentials are not configured')
    }
    return `Basic ${btoa(`${apiEmail}:${apiToken}`)}`
}

/**
 * Joins a REST path onto the Jira base. NOT `new URL(path, baseUrl)` — that
 * drops the base's own path, which is fatal for the scoped-token gateway base
 * (https://api.atlassian.com/ex/jira/<cloudId>): the cloudId prefix would be
 * stripped and every call would 404. Same reasoning as the sponsor portal's
 * jira-client.server.ts.
 */
export function joinJiraUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/$/, '')}${path}`
}

/**
 * Fetches the whole run sheet: a JQL search for its issue ids, then a bulk
 * fetch for their fields. Always the whole of it — one cached answer serves
 * every filter, so however volunteers filter the page, Jira sees at most two
 * calls per cache period. `fetchedAt` is when the older of the two responses
 * actually came from Jira.
 */
export async function fetchRunsheet({
    config,
    apiEmail,
    apiToken,
    apiBaseUrl,
    jql,
    cacheTtlSeconds,
    cacheGeneration,
    timezone,
}: FetchRunsheetOptions): Promise<{ items: RunsheetItem[]; placeholders: RunsheetPlaceholder[]; fetchedAt: string }> {
    const authorization = jiraAuthorization(apiEmail, apiToken)
    const { fields } = config.jira
    const baseUrl = apiBaseUrl ?? config.jira.baseUrl
    const joinUrl = (path: string) => joinJiraUrl(baseUrl, path)

    const searchParams = new URLSearchParams({
        jql: jql ?? config.jira.jql,
        maxResults: '150',
        fields: 'id',
    })

    const search = await jiraFetch(
        joinUrl(`/rest/api/3/search/jql?${searchParams.toString()}`),
        authorization,
        { method: 'GET' },
        cacheTtlSeconds,
        cacheGeneration,
    )
    const issueIds = searchResponseSchema.parse(search.body).issues.map((issue) => issue.id)

    if (issueIds.length === 0) {
        return { items: [], placeholders: [], fetchedAt: search.fetchedAt }
    }

    const bulkBody = JSON.stringify({
        fields: [fields.startTime, fields.endTime, fields.location, fields.team, fields.roleInstructions, 'summary'],
        fieldsByKeys: false,
        issueIdsOrKeys: issueIds,
        properties: [],
    })

    const bulk = await jiraFetch(
        joinUrl('/rest/api/3/issue/bulkfetch'),
        authorization,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bulkBody },
        cacheTtlSeconds,
        cacheGeneration,
    )

    const issues = buildBulkResponseSchema(fields).parse(bulk.body).issues

    // Field ids are config, so these come back as `unknown` from the loose
    // schema — narrow each to the shape the page renders.
    const asString = (value: unknown): string | null => (typeof value === 'string' ? value : null)
    const asLabels = (value: unknown): string[] =>
        Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []

    const items: RunsheetItem[] = []
    const placeholders: RunsheetPlaceholder[] = []
    for (const issue of issues) {
        const teams = asLabels(issue.fields[fields.team])
        const startTime = asString(issue.fields[fields.startTime])
        const endTime = asString(issue.fields[fields.endTime])
        const roleInstructionsUrl = asString(issue.fields[fields.roleInstructions])
        const isBreak = isBreakSummary(issue.fields.summary)

        if (config.sessionTeam && teams.includes(config.sessionTeam)) {
            placeholders.push({ startTime, endTime, teams, roleInstructionsUrl, isBreak })
            continue
        }

        const locationKeys = asLabels(issue.fields[fields.location])
        items.push({
            id: issue.id,
            summary: issue.fields.summary,
            startTime,
            endTime,
            locations: locationKeys.map((label) => config.locationLabels[label] ?? label),
            teams: teams.map((label) => config.teamLabels[label] ?? label),
            locationKeys,
            teamKeys: teams,
            roleInstructionsUrl,
            source: 'jira',
            sessionizeSessionId: null,
            isBreak,
        })
    }

    const fetchedAt = search.fetchedAt < bulk.fetchedAt ? search.fetchedAt : bulk.fetchedAt
    return { items: items.sort(compareRunsheetItems(timezone)), placeholders, fetchedAt }
}

type SessionConfig = Pick<
    RunsheetsConfig,
    'locationLabels' | 'teamLabels' | 'sessionizeRoomLocations' | 'plenumLocations' | 'sessionTeam'
>

/**
 * The published agenda's sessions — talks and service sessions (breaks,
 * changeovers, registration) — as run sheet rows under the configured
 * `sessionTeam`. Locations are always `locationLabels` keys, so the location
 * filter matches sessions and Jira items alike:
 *
 * - A service session is located only by its *description*, which the
 *   committee fills with comma-separated keys
 *   (`loc-river-view-room-1, loc-cygnet-room`). One left without a
 *   description (a changeover) gets no location and no team either.
 * - A plenum talk is held across `plenumLocations`. Sessionize files every
 *   plenum under its first room, so its room says nothing about where it's
 *   held.
 * - Any other talk is located by its Sessionize room, through
 *   `sessionizeRoomLocations`.
 *
 * Callers must pass sessions from the *published* schedule: this page is
 * public, so a draft agenda passed here would announce it early.
 */
export function sessionsToRunsheetItems(
    sessions: RunsheetSession[],
    config: SessionConfig,
    { placeholders, timezone }: { placeholders: RunsheetPlaceholder[]; timezone: string },
): RunsheetItem[] {
    const overlapping = overlappingPlaceholders(placeholders, timezone)

    return sessions.map((session): RunsheetItem => {
        const locationKeys = sessionLocationKeys(session, config)
        const unassigned = session.isServiceSession && locationKeys.length === 0
        // A session left without a location (a changeover) gets no team
        // either, so it takes nothing from a placeholder.
        const matched = unassigned ? [] : overlapping(session)
        // Who else works a session (photographers, room coordinators) is the
        // committee's call per slot, so it comes from the placeholders' teams.
        // The placeholder marker itself is internal, so it isn't one of them.
        const teams = unassigned
            ? []
            : [...new Set(matched.flatMap((p) => p.teams))].filter((team) => team !== config.sessionTeam)

        // An unmapped key still displays as itself, like an unmapped Jira
        // label; an unmapped room displays by its Sessionize name.
        const locations = locationKeys.length
            ? locationKeys.map((key) => config.locationLabels[key] ?? key)
            : session.room && !session.isPlenumSession && !session.isServiceSession
              ? [session.room]
              : []
        const speakers = session.speakers.map((speaker) => speaker.name).join(', ')

        return {
            // Prefixed so a Sessionize id can't collide with a Jira one.
            id: `session-${session.id}`,
            summary: speakers ? `${session.title} (${speakers})` : session.title,
            startTime: session.startsAt,
            endTime: session.endsAt,
            locations,
            teams: teams.map((team) => config.teamLabels[team] ?? team),
            locationKeys,
            teamKeys: teams,
            roleInstructionsUrl: matched.find((p) => p.roleInstructionsUrl)?.roleInstructionsUrl ?? null,
            source: 'agenda',
            // Service sessions have nothing to open: their description is
            // location ids, and they have no speakers.
            sessionizeSessionId: session.isServiceSession ? null : session.id,
            // Not `matched`: a break with no location is still a break.
            isBreak: session.isServiceSession && overlapping(session).some((p) => p.isBreak),
        }
    })
}

/**
 * Finds the placeholders whose time overlaps a session's. Matched on time
 * because a placeholder and the sessions filling it share nothing else: the
 * slot placeholder "Session 1" covers all five talks in that slot, and a
 * Jira break can start a few minutes off the Sessionize one.
 */
function overlappingPlaceholders(placeholders: RunsheetPlaceholder[], timezone: string) {
    const toMillis = (iso: string | null) => (iso ? DateTime.fromISO(iso, { zone: timezone }).toMillis() : NaN)
    const windows = placeholders
        .map((placeholder) => ({
            placeholder,
            start: toMillis(placeholder.startTime),
            end: toMillis(placeholder.endTime),
        }))
        .filter(({ start, end }) => start < end)

    return (session: RunsheetSession) => {
        const start = toMillis(session.startsAt)
        const end = toMillis(session.endsAt)
        // Strictly overlapping: back-to-back slots only touch, so a changeover
        // between two sessions matches neither.
        return windows.filter((window) => window.start < end && start < window.end).map((w) => w.placeholder)
    }
}

function sessionLocationKeys(session: RunsheetSession, config: SessionConfig): string[] {
    if (session.isServiceSession) {
        return (session.description ?? '')
            .split(',')
            .map((key) => key.trim())
            .filter(Boolean)
    }
    if (session.isPlenumSession && config.plenumLocations?.length) return config.plenumLocations
    const roomKey = session.room ? config.sessionizeRoomLocations?.[session.room] : undefined
    return roomKey ? [roomKey] : []
}

/**
 * Orders run sheet rows by start time. Compared as instants, not strings:
 * Jira datetimes carry an offset and Sessionize's are local to the
 * conference, so the two only line up once both are read in its timezone.
 */
export function compareRunsheetItems(timezone: string) {
    const toMillis = (iso: string | null) => (iso ? DateTime.fromISO(iso, { zone: timezone }).toMillis() : NaN)
    return (a: RunsheetItem, b: RunsheetItem) => {
        const aStart = toMillis(a.startTime)
        const bStart = toMillis(b.startTime)
        // Items with no start time sort last rather than disappearing.
        if (Number.isNaN(aStart) && Number.isNaN(bStart)) return 0
        if (Number.isNaN(aStart)) return 1
        if (Number.isNaN(bStart)) return -1
        return aStart - bStart
    }
}
