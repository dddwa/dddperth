import type { RunsheetsBumpInConfig, RunsheetsConfig } from '@ddd/conference-config'
import { DateTime } from 'luxon'
import { z } from 'zod'
import { jiraAuthorization, jiraFetch, joinJiraUrl, type RunsheetItem } from './runsheet-client.server'

/**
 * Exhibitor rows for the bump-in run sheet, generated from the sponsors
 * board so the committee doesn't retype each sponsor's arrival as a
 * volunteer ticket.
 *
 * The page is anonymous and a sponsor issue is mostly private: contact names,
 * phones and emails, bump-in attendee lists, the deal value in the summary,
 * ticket and upload links. Three layers keep that off the page:
 *
 * 1. Only the field ids in `bumpIn.sponsors.fields` are requested, so Jira
 *    never sends anything else. `summary` is deliberately not among them.
 * 2. Every value is narrowed to the shape its field is meant to have; a field
 *    whose type changes in Jira renders blank rather than dumping an object.
 * 3. The free-text fields are sponsor-written, so emails and phone numbers
 *    are stripped from them in case someone typed a contact into "trolley".
 */

export interface ExhibitorDetails {
    tier: string | null
    /** The slot as the sponsor picked it, e.g. "Friday 2pm - 3pm". */
    slot: string | null
    /** Needs the under-stadium ring road for bump-in. */
    ringRoad: boolean
    trolley: string | null
    loadingDockAssistance: string | null
    porterAssistance: string | null
}

export interface BumpInItem extends RunsheetItem {
    /** Present on rows generated from a sponsor issue. */
    exhibitor?: ExhibitorDetails
}

const searchResponseSchema = z.object({
    issues: z.array(
        z.object({
            id: z.string(),
            fields: z.record(z.string(), z.unknown()),
        }),
    ),
})

export type SponsorIssue = z.infer<typeof searchResponseSchema>['issues'][number]

const EMAIL_PATTERN = /[^\s@<>()[\]]+@[^\s@<>()[\]]+\.[^\s@<>()[\]]+/g
// Seven or more digits with the usual separators — a phone number, not "2 crates".
const PHONE_PATTERN = /\+?\d[\d\s().-]{5,}\d/g
const NOTHING_NEEDED = /^(no|nope|none|nil|n\/?a|not required|not needed|-)\.?$/i
const MAX_TEXT_LENGTH = 200

/** Sponsor-written free text, safe to publish, or null when it says nothing. */
export function publicFreeText(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const text = value.replace(EMAIL_PATTERN, '').replace(PHONE_PATTERN, '').replace(/\s+/g, ' ').trim()
    if (text === '' || NOTHING_NEEDED.test(text)) return null
    return text.length > MAX_TEXT_LENGTH ? `${text.slice(0, MAX_TEXT_LENGTH - 1)}…` : text
}

function asText(value: unknown): string | null {
    return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function asOption(value: unknown): string | null {
    if (value && typeof value === 'object' && 'value' in value) return asText(value.value)
    return null
}

function asOptions(value: unknown): string[] {
    return Array.isArray(value) ? value.map(asOption).filter((option): option is string => option !== null) : []
}

/**
 * Maps sponsor issues to bump-in rows. A sponsor gets a row when they've
 * picked a slot, or when their tier exhibits and they haven't yet — that
 * second case is the one the committee most needs to see on the sheet.
 */
export function mapSponsorBumpIn(
    issues: SponsorIssue[],
    bumpIn: RunsheetsBumpInConfig['sponsors'],
    teamLabels: RunsheetsConfig['teamLabels'],
): BumpInItem[] {
    const { fields } = bumpIn
    const rows: BumpInItem[] = []

    for (const issue of issues) {
        const get = (fieldId: string | undefined) => (fieldId ? issue.fields[fieldId] : undefined)

        const companyName = asText(get(fields.companyName))
        const tier = asOption(get(fields.tier))
        const slot = asOption(get(fields.bumpInSlot))
        if (!companyName) continue
        if (!slot && !(tier && bumpIn.exhibitingTiers.includes(tier))) continue

        const timing = slot && Object.hasOwn(bumpIn.slots, slot) ? bumpIn.slots[slot] : undefined

        const room = asOption(get(fields.exhibitorRoom))
        const spaceNumber = asText(get(fields.exhibitorSpaceNumber))
        const locations = [room, spaceNumber ? `Space ${spaceNumber}` : null].filter(
            (part): part is string => part !== null,
        )

        rows.push({
            id: `sponsor-${issue.id}`,
            summary: `Exhibitor - ${companyName}`,
            startTime: timing?.start ?? null,
            endTime: timing?.end ?? null,
            locations,
            teams: timing ? [teamLabels[timing.team] ?? timing.team] : [],
            // The room and space are free text off the sponsor issue, not
            // location labels, so there's nothing for a location filter to match.
            locationKeys: [],
            teamKeys: timing ? [timing.team] : [],
            roleInstructionsUrl: null,
            source: 'jira',
            sessionizeSessionId: null,
            exhibitor: {
                tier,
                slot,
                ringRoad: asOptions(get(fields.underStadiumDropOff)).includes(bumpIn.underStadiumBumpInOption),
                trolley: publicFreeText(get(fields.trolley)),
                loadingDockAssistance: publicFreeText(get(fields.loadingDockAssistance)),
                porterAssistance: publicFreeText(get(fields.porterAssistance)),
            },
        })
    }

    return rows
}

export interface FetchSponsorBumpInOptions {
    config: RunsheetsConfig
    bumpIn: RunsheetsBumpInConfig
    apiEmail: string | undefined
    apiToken: string | undefined
    apiBaseUrl?: string
    cacheTtlSeconds: number
    cacheGeneration: string
}

export async function fetchSponsorBumpIn({
    config,
    bumpIn,
    apiEmail,
    apiToken,
    apiBaseUrl,
    cacheTtlSeconds,
    cacheGeneration,
}: FetchSponsorBumpInOptions): Promise<BumpInItem[]> {
    const authorization = jiraAuthorization(apiEmail, apiToken)
    const baseUrl = apiBaseUrl ?? config.jira.baseUrl

    const requestFields = Object.values(bumpIn.sponsors.fields).filter(
        (id): id is string => typeof id === 'string' && id !== '',
    )
    const searchParams = new URLSearchParams({
        jql: bumpIn.sponsors.jql,
        maxResults: '100',
        fields: requestFields.join(','),
    })

    const { body } = await jiraFetch(
        joinJiraUrl(baseUrl, `/rest/api/3/search/jql?${searchParams.toString()}`),
        authorization,
        { method: 'GET' },
        cacheTtlSeconds,
        cacheGeneration,
    )

    return mapSponsorBumpIn(searchResponseSchema.parse(body).issues, bumpIn.sponsors, config.teamLabels)
}

/** Earliest first; untimed rows (no slot, or an unmapped one) last. */
export function sortByStartTime<T extends { startTime: string | null; summary: string }>(items: T[]): T[] {
    return [...items].sort((a, b) => {
        if (a.startTime === null && b.startTime === null) return a.summary.localeCompare(b.summary)
        if (a.startTime === null) return 1
        if (b.startTime === null) return -1
        // Jira writes `+0800` and the config `+08:00`, so compare instants,
        // not strings. `Date.parse` isn't specified for the colon-less form.
        const difference = DateTime.fromISO(a.startTime).toMillis() - DateTime.fromISO(b.startTime).toMillis()
        return difference || a.summary.localeCompare(b.summary)
    })
}
