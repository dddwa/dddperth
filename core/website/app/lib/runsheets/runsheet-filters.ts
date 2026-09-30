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
}

/**
 * The Team filter's "Agenda" option: selects the published agenda's sessions
 * alongside a team's own items. Without it, filtering to a team hid the agenda
 * entirely, since most sessions carry no team — so a volunteer checking their
 * team's duties lost sight of what was on around them.
 */
export const AGENDA_TEAM_FILTER = 'agenda'

/**
 * Configured labels to show. An empty list means no filter on that field, not
 * "match nothing". Values within a list are OR'd; the two lists are AND'd.
 */
export type RunsheetFilters = { teams: string[]; locations: string[] }

/**
 * Parses the `team` and `location` query params into known labels. Any value
 * that isn't a configured label is dropped, so an unrecognised filter widens
 * the run sheet back towards unfiltered rather than emptying it.
 */
export function parseRunsheetFilters(
    searchParams: URLSearchParams,
    labels: { teamLabels: Record<string, string>; locationLabels: Record<string, string> },
): RunsheetFilters {
    const known = (name: string, allowed: Record<string, string>) => [
        ...new Set(searchParams.getAll(name).filter((value) => Object.hasOwn(allowed, value))),
    ]
    return {
        teams: known('team', { ...labels.teamLabels, [AGENDA_TEAM_FILTER]: 'Agenda' }),
        locations: known('location', labels.locationLabels),
    }
}

/**
 * (any selected team) AND (any selected location); an empty list matches
 * everything. An agenda session matches the Team filter when "Agenda" is one
 * of the selected teams, whatever teams it carries.
 */
export function filterRunsheetItems(items: RunsheetItem[], filters: RunsheetFilters): RunsheetItem[] {
    const matches = (selected: string[], keys: string[]) =>
        selected.length === 0 || keys.some((key) => selected.includes(key))
    const teamKeys = (item: RunsheetItem) =>
        item.source === 'agenda' ? [...item.teamKeys, AGENDA_TEAM_FILTER] : item.teamKeys
    return items.filter(
        (item) => matches(filters.teams, teamKeys(item)) && matches(filters.locations, item.locationKeys),
    )
}
