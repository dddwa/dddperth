/**
 * The run sheet's team/location filters. Client-safe: the page loads the whole
 * run sheet once and filters it in the browser, so changing a filter doesn't
 * go back to the server (or Jira). The server applies the same filter to its
 * first render, which is what keeps the filter form working without JS.
 */

/** One run sheet row. */
export interface RunsheetItem {
    id: string
    summary: string
    /** ISO datetime, or null. Formatted for display in the route. */
    startTime: string | null
    endTime: string | null
    /** Display names, falling back to the raw label when unmapped. */
    locations: string[]
    teams: string[]
    /** The configured label keys behind `locations` and `teams`, which is what the filters match. */
    locationKeys: string[]
    teamKeys: string[]
    /** Role instructions URL. Publicly shared, so safe to render. */
    roleInstructionsUrl: string | null
    /** Where the row came from: a Jira run sheet item, or the published agenda. */
    source: 'jira' | 'agenda'
    /** Set for an agenda talk, whose details the page can open in a modal. */
    sessionizeSessionId: string | null
    /** A break (see `isBreakSummary`), which the "Show Breaks" toggle keeps in view. */
    isBreak?: boolean
}

/**
 * The Team filter's "Agenda" option: selects the published agenda's sessions
 * alongside a team's own items. Without it, filtering to a team hid the agenda
 * entirely, since most sessions carry no team — so a volunteer checking their
 * team's duties lost sight of what was on around them.
 */
export const AGENDA_TEAM_FILTER = 'agenda'

/**
 * The "Show Agenda" toggle's query param. Unlike the Team filter's "Agenda"
 * option, which the Location filter still narrows, this shows every agenda
 * session regardless of the other filters.
 */
export const SHOW_AGENDA_PARAM = 'agenda'

/**
 * The "Show Breaks" toggle's query param: shows every break regardless of the
 * other filters, so a team's own view still says when morning tea and lunch are.
 */
export const SHOW_BREAKS_PARAM = 'breaks'

/**
 * The committee marks a break by titling its Jira item "[Break] …". Most of
 * those are placeholders for an agenda service session, so they're hidden and
 * the session they overlap is the break shown instead (see
 * `sessionsToRunsheetItems`). Other service sessions (changeovers,
 * registration) aren't breaks.
 */
export const isBreakSummary = (summary: string) => /^\[break\]/i.test(summary.trim())

/**
 * Configured labels to show. An empty list means no filter on that field, not
 * "match nothing". Values within a list are OR'd; the two lists are AND'd.
 * `showAgenda` keeps every agenda session in view whatever the lists select,
 * and `showBreaks` does the same for just the breaks.
 */
export type RunsheetFilters = { teams: string[]; locations: string[]; showAgenda: boolean; showBreaks: boolean }

/**
 * Parses the `team` and `location` query params into known labels. Any value
 * that isn't a configured label is dropped, so an unrecognised filter widens
 * the run sheet back towards unfiltered rather than emptying it. `agenda=1`
 * is the "Show Agenda" toggle and `breaks=1` the "Show Breaks" one.
 *
 * `agenda: false` is for a run sheet with no agenda sessions (bump-in), where
 * the "Agenda" team would filter to nothing and Show Agenda and Show Breaks
 * would do nothing.
 */
export function parseRunsheetFilters(
    searchParams: URLSearchParams,
    labels: { teamLabels: Record<string, string>; locationLabels: Record<string, string> },
    { agenda = true }: { agenda?: boolean } = {},
): RunsheetFilters {
    const known = (name: string, allowed: Record<string, string>) => [
        ...new Set(searchParams.getAll(name).filter((value) => Object.hasOwn(allowed, value))),
    ]
    return {
        teams: known('team', agenda ? { ...labels.teamLabels, [AGENDA_TEAM_FILTER]: 'Agenda' } : labels.teamLabels),
        locations: known('location', labels.locationLabels),
        showAgenda: agenda && searchParams.get(SHOW_AGENDA_PARAM) === '1',
        showBreaks: agenda && searchParams.get(SHOW_BREAKS_PARAM) === '1',
    }
}

/**
 * The labels that at least one item carries. A run sheet that shares the
 * conference day's labels (bump-in) would otherwise offer filters that empty it.
 */
export function labelsInUse(labels: Record<string, string>, keys: Iterable<string>): Record<string, string> {
    const used = new Set(keys)
    return Object.fromEntries(Object.entries(labels).filter(([key]) => used.has(key)))
}

/**
 * Splits rows into headed sections, in the order each heading first appears.
 * Rows sharing a heading are gathered into one section even when they don't
 * arrive together, so a heading never appears twice.
 */
export function groupRunsheetSections<Item>(
    items: Item[],
    sectionOf: ((item: Item) => string) | undefined,
): Array<{ heading: string | null; items: Item[] }> {
    const sections = new Map<string | null, Item[]>()
    for (const item of items) {
        const heading = sectionOf?.(item) ?? null
        const section = sections.get(heading)
        if (section) section.push(item)
        else sections.set(heading, [item])
    }
    return Array.from(sections, ([heading, sectionItems]) => ({ heading, items: sectionItems }))
}

/**
 * (any selected team) AND (any selected location); an empty list matches
 * everything. An agenda session matches the Team filter when "Agenda" is one
 * of the selected teams, whatever teams it carries — and skips both filters
 * when `showAgenda` is on, as a break does when `showBreaks` is.
 */
export function filterRunsheetItems<Item extends RunsheetItem>(items: Item[], filters: RunsheetFilters): Item[] {
    const matches = (selected: string[], keys: string[]) =>
        selected.length === 0 || keys.some((key) => selected.includes(key))
    const teamKeys = (item: RunsheetItem) =>
        item.source === 'agenda' ? [...item.teamKeys, AGENDA_TEAM_FILTER] : item.teamKeys
    return items.filter(
        (item) =>
            (filters.showAgenda && item.source === 'agenda') ||
            (filters.showBreaks && item.isBreak) ||
            (matches(filters.teams, teamKeys(item)) && matches(filters.locations, item.locationKeys)),
    )
}
