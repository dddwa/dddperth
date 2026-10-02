import { conferenceManifest } from '@conference/manifest'
import { describe, expect, it } from 'vitest'
import type { RunsheetItem, RunsheetPlaceholder, RunsheetSession } from './runsheet-client.server'
import { compareRunsheetItems, jiraCacheKey, sessionsToRunsheetItems } from './runsheet-client.server'
import {
    filterRunsheetItems,
    groupRunsheetSections,
    labelsInUse,
    parseRunsheetFilters,
    type RunsheetFilters,
} from './runsheet-filters'

/**
 * `/runsheets` is a public, unauthenticated page, and its `team` and
 * `location` query params are its only caller-controlled input. Nothing from
 * them reaches Jira any more (the page filters the whole run sheet itself),
 * but `parseRunsheetFilters` still only lets through labels the fork
 * configured, so an unknown value widens the filter rather than breaking it.
 */

/** A minimal fork config — the parser only reads the two label maps. */
const config = {
    teamLabels: { 'team-1': 'Team 1', 'team-photographers': 'Photographers' },
    locationLabels: { 'loc-cygnet-room': 'Cygnet Room', 'loc-L2-Lobby': 'Lobby Level 2' },
}

const parse = (query: string) => parseRunsheetFilters(new URLSearchParams(query), config)

describe('parseRunsheetFilters', () => {
    it('accepts several configured teams and locations', () => {
        expect(parse('team=team-1&team=team-photographers&location=loc-cygnet-room')).toEqual({
            teams: ['team-1', 'team-photographers'],
            locations: ['loc-cygnet-room'],
            showAgenda: false,
        })
    })

    it('means no filter when nothing is selected', () => {
        expect(parse('')).toEqual({ teams: [], locations: [], showAgenda: false })
    })

    it('drops a repeated value', () => {
        expect(parse('team=team-1&team=team-1').teams).toEqual(['team-1'])
    })

    it('drops a label this fork has not configured, keeping the rest', () => {
        // Present in DDD Perth's real config but not in this fixture — the
        // allowlist is the config, not a constant baked into core.
        expect(parse('team=team-5&team=team-1&location=loc-sports-lounge')).toEqual({
            teams: ['team-1'],
            locations: [],
            showAgenda: false,
        })
    })

    it('accepts the agenda as a team', () => {
        expect(parse('team=agenda&team=team-1').teams).toEqual(['agenda', 'team-1'])
    })

    it('reads the Show Agenda toggle', () => {
        expect(parse('agenda=1&team=team-1')).toEqual({ teams: ['team-1'], locations: [], showAgenda: true })
        expect(parse('agenda=yes').showAgenda).toBe(false)
    })

    it('ignores the agenda filters on a run sheet without agenda sessions', () => {
        // Bump-in: `?team=agenda` would otherwise filter it to nothing.
        expect(
            parseRunsheetFilters(new URLSearchParams('team=agenda&team=team-1&agenda=1'), config, { agenda: false }),
        ).toEqual({ teams: ['team-1'], locations: [], showAgenda: false })
    })

    it('does not accept a label under the other kind', () => {
        expect(parse('team=loc-cygnet-room&location=team-1')).toEqual({ teams: [], locations: [], showAgenda: false })
    })

    it('drops JQL injection attempts', () => {
        // Each of these would change the query's meaning if interpolated.
        const attacks = [
            'team-1" OR "1"="1',
            'team-1 OR project = SPN',
            'loc-cygnet-room") OR (reporter != null',
            'team-1\nAND assignee != null',
        ]
        for (const attack of attacks) {
            expect(
                parse(
                    new URLSearchParams([
                        ['team', attack],
                        ['location', attack],
                    ]).toString(),
                ),
            ).toEqual({
                teams: [],
                locations: [],
                showAgenda: false,
            })
        }
    })

    it('does not treat inherited Object properties as labels', () => {
        // A plain `in` check would say `'constructor' in config.teamLabels`.
        expect(parse('team=constructor&team=toString&team=__proto__').teams).toEqual([])
    })
})

describe("this fork's runsheets config", () => {
    const forkConfig = conferenceManifest.runsheets

    it('accepts every label its own filters offer', () => {
        // The filters are built from these maps, so anything they can select
        // has to survive the round trip through the URL. Skipped for a fork
        // with no volunteer board — /runsheets 404s there.
        if (!forkConfig) return

        const teams = Object.keys(forkConfig.teamLabels)
        const locations = Object.keys(forkConfig.locationLabels)
        const query = new URLSearchParams([
            ...teams.map((team) => ['team', team]),
            ...locations.map((location) => ['location', location]),
        ])
        expect(parseRunsheetFilters(query, forkConfig)).toEqual({ teams, locations, showAgenda: false })
    })
})

describe('sessionsToRunsheetItems', () => {
    const sessionConfig = {
        teamLabels: config.teamLabels,
        locationLabels: { ...config.locationLabels, 'loc-main-1': 'Main 1', 'loc-main-2': 'Main 2' },
        sessionizeRoomLocations: { 'Cygnet room (Lv 2)': 'loc-cygnet-room', 'Main (Lv 3)': 'loc-main-1' },
        plenumLocations: ['loc-main-1', 'loc-main-2'],
        sessionTeam: 'session',
    }
    const session = (overrides: Partial<RunsheetSession>): RunsheetSession => ({
        id: '1',
        title: 'A talk',
        description: null,
        startsAt: '2026-10-03T09:30:00',
        endsAt: '2026-10-03T10:15:00',
        room: 'Cygnet room (Lv 2)',
        speakers: [{ id: 's1', name: 'Speaker One' }],
        isServiceSession: false,
        isPlenumSession: false,
        ...overrides,
    })
    // Sessionize files every plenum under its first room.
    const plenum = (overrides: Partial<RunsheetSession>) =>
        session({ room: 'Main (Lv 3)', speakers: [], isPlenumSession: true, ...overrides })
    const noFilters = { teams: [], locations: [], showAgenda: false }
    const toItems = (sessions: RunsheetSession[], filters: RunsheetFilters, placeholders: RunsheetPlaceholder[] = []) =>
        filterRunsheetItems(
            sessionsToRunsheetItems(sessions, sessionConfig, { placeholders, timezone: 'Australia/Perth' }),
            filters,
        )
    const locationsOf = (s: RunsheetSession) => toItems([s], noFilters)[0].locations
    const location = (...locations: string[]) => ({ teams: [], locations, showAgenda: false })

    it('locates a talk under its mapped room, in the session team', () => {
        expect(toItems([session({})], noFilters)).toEqual([
            {
                id: 'session-1',
                summary: 'A talk (Speaker One)',
                startTime: '2026-10-03T09:30:00',
                endTime: '2026-10-03T10:15:00',
                locations: ['Cygnet Room'],
                teams: [],
                locationKeys: ['loc-cygnet-room'],
                teamKeys: [],
                roleInstructionsUrl: null,
                source: 'agenda',
                sessionizeSessionId: '1',
            },
        ])
    })

    it('falls back to the Sessionize room name for an unmapped room', () => {
        expect(locationsOf(session({ room: 'Somewhere else' }))).toEqual(['Somewhere else'])
    })

    it('holds a plenum across the plenum locations, not the room Sessionize files it under', () => {
        expect(locationsOf(plenum({ title: 'Keynote' }))).toEqual(['Main 1', 'Main 2'])
    })

    it("locates a service session by its description's location ids, over the plenum locations", () => {
        const changeover = plenum({ isServiceSession: true, description: 'loc-cygnet-room, loc-L2-Lobby,' })
        expect(locationsOf(changeover)).toEqual(['Cygnet Room', 'Lobby Level 2'])
        expect(toItems([changeover], location('loc-L2-Lobby'))).toHaveLength(1)
        expect(toItems([changeover], location('loc-main-1'))).toEqual([])
    })

    it('gives a service session with no description no location and no team', () => {
        const changeover = plenum({ title: 'Changeover', isServiceSession: true })
        expect(toItems([changeover], noFilters)).toMatchObject([{ summary: 'Changeover', locations: [], teams: [] }])
        const slot = {
            startTime: '2026-10-03T09:00:00.000+0800',
            endTime: '2026-10-03T11:00:00.000+0800',
            teams: ['session', 'team-1'],
            roleInstructionsUrl: null,
        }
        expect(toItems([changeover], { teams: ['team-1'], locations: [], showAgenda: false }, [slot])).toEqual([])
    })

    it("ignores a talk's description, which is its abstract", () => {
        expect(locationsOf(session({ description: 'loc-L2-Lobby' }))).toEqual(['Cygnet Room'])
    })

    it('matches a location filter through the room map', () => {
        const sessions = [session({ id: '1' }), session({ id: '2', room: 'Somewhere else' })]
        expect(toItems(sessions, location('loc-cygnet-room')).map((item) => item.id)).toEqual(['session-1'])
    })

    it('matches any of the selected locations, and a team filter alongside them', () => {
        const sessions = [
            session({ id: '1' }),
            session({ id: '2', room: 'Main (Lv 3)' }),
            session({ id: '3', room: 'Somewhere else' }),
        ]
        const ids = (filters: RunsheetFilters) => toItems(sessions, filters).map((item) => item.id)
        expect(ids(location('loc-cygnet-room', 'loc-main-1'))).toEqual(['session-1', 'session-2'])
        const slot = {
            startTime: '2026-10-03T09:30:00.000+0800',
            endTime: '2026-10-03T10:15:00.000+0800',
            teams: ['session', 'team-1'],
            roleInstructionsUrl: null,
        }
        const withSlot = (filters: RunsheetFilters) => toItems(sessions, filters, [slot]).map((item) => item.id)
        expect(withSlot({ teams: ['team-1'], locations: ['loc-main-1'], showAgenda: false })).toEqual(['session-2'])
        expect(ids({ teams: ['team-1'], locations: ['loc-main-1'], showAgenda: false })).toEqual([])
    })

    it('carries the teams and role instructions of the placeholders a session overlaps', () => {
        const placeholder = (startTime: string, endTime: string, teams: string[], url: string | null) => ({
            startTime: `2026-10-03T${startTime}:00.000+0800`,
            endTime: `2026-10-03T${endTime}:00.000+0800`,
            teams,
            roleInstructionsUrl: url,
        })
        const slot = placeholder('09:30', '10:15', ['session', 'team-1'], 'https://example.com/role')
        const before = placeholder('08:45', '09:30', ['session', 'team-2'], 'https://example.com/before')
        const [item] = toItems([session({})], noFilters, [slot, before])
        // `before` only touches the talk's 9:30 start, so it isn't carried.
        expect(item).toMatchObject({
            teams: ['Team 1'],
            roleInstructionsUrl: 'https://example.com/role',
        })
        expect(toItems([session({})], { teams: ['team-1'], locations: [], showAgenda: false }, [slot])).toHaveLength(1)
        expect(toItems([session({})], { teams: ['team-2'], locations: [], showAgenda: false }, [slot, before])).toEqual(
            [],
        )
    })

    it('gives a changeover nothing from an overlapping placeholder', () => {
        const changeover = session({ title: 'Changeover', speakers: [], isServiceSession: true, isPlenumSession: true })
        const slot = {
            startTime: '2026-10-03T09:00:00.000+0800',
            endTime: '2026-10-03T11:00:00.000+0800',
            teams: ['session', 'team-1'],
            roleInstructionsUrl: 'https://example.com/role',
        }
        expect(toItems([changeover], noFilters, [slot])[0]).toMatchObject({ teams: [], roleInstructionsUrl: null })
    })

    it("matches a team from the session's placeholders, never the internal session team", () => {
        const team = (...teams: string[]) => ({ teams, locations: [], showAgenda: false })
        const slot = {
            startTime: '2026-10-03T09:30:00.000+0800',
            endTime: '2026-10-03T10:15:00.000+0800',
            teams: ['session', 'team-photographers'],
            roleInstructionsUrl: null,
        }
        expect(toItems([session({})], team('session'), [slot])).toEqual([])
        expect(toItems([session({})], team('team-photographers'))).toEqual([])
        expect(toItems([session({})], team('team-1', 'team-photographers'), [slot])).toHaveLength(1)
        expect(toItems([session({})], team('team-1'), [slot])).toEqual([])
    })
})

describe('compareRunsheetItems', () => {
    const item = (id: string, startTime: string | null): RunsheetItem => ({
        id,
        summary: id,
        startTime,
        endTime: null,
        locations: [],
        teams: [],
        locationKeys: [],
        teamKeys: [],
        roleInstructionsUrl: null,
        source: 'jira',
        sessionizeSessionId: null,
    })

    it('orders offset Jira times and local Sessionize times as instants', () => {
        const items = [
            item('talk', '2026-10-03T09:30:00'),
            item('jira', '2026-10-03T09:00:00.000+0800'),
            item('untimed', null),
        ]
        expect(items.sort(compareRunsheetItems('Australia/Perth')).map((i) => i.id)).toEqual([
            'jira',
            'talk',
            'untimed',
        ])
    })
})

describe('jiraCacheKey', () => {
    const bulk = 'https://example.atlassian.net/rest/api/3/issue/bulkfetch'

    it('gives each request body its own key, outside the fragment the Cache API ignores', async () => {
        const all = await jiraCacheKey(bulk, JSON.stringify({ issueIdsOrKeys: ['1', '2', '3'] }))
        const filtered = await jiraCacheKey(bulk, JSON.stringify({ issueIdsOrKeys: ['2'] }))
        // What the Cache API actually matches on: the URL without its fragment.
        const matched = (key: string) => new URL(key).href.replace(/#.*$/, '')
        expect(matched(all)).not.toBe(matched(filtered))
    })

    it('keeps the same key for the same body, and the bare URL with none', async () => {
        const body = JSON.stringify({ issueIdsOrKeys: ['1'] })
        expect(await jiraCacheKey(bulk, body)).toBe(await jiraCacheKey(bulk, body))
        expect(await jiraCacheKey(`${bulk}?a=1`, body)).toMatch(/\?a=1&__body=[0-9a-f]{64}$/)
        expect(await jiraCacheKey(bulk, undefined)).toBe(bulk)
    })

    it('gives each cache generation its own key, so an admin refresh misses every old entry', async () => {
        const matched = (key: string) => new URL(key).href.replace(/#.*$/, '')
        const body = JSON.stringify({ issueIdsOrKeys: ['1'] })
        const before = await jiraCacheKey(bulk, body, 'generation-1')
        const after = await jiraCacheKey(bulk, body, 'generation-2')
        expect(matched(before)).not.toBe(matched(after))
        expect(await jiraCacheKey(bulk, undefined, 'generation-1')).not.toBe(bulk)
    })
})

describe('filterRunsheetItems', () => {
    const row = (
        id: string,
        teamKeys: string[],
        locationKeys: string[],
        source: RunsheetItem['source'] = 'jira',
    ): RunsheetItem => ({
        id,
        summary: id,
        startTime: null,
        endTime: null,
        locations: [],
        teams: [],
        locationKeys,
        teamKeys,
        roleInstructionsUrl: null,
        source,
        sessionizeSessionId: null,
    })
    const rows = [
        row('photos-black-swan', ['team-photographers'], ['loc-black-swan-room']),
        row('team-1-cygnet', ['team-1'], ['loc-cygnet-room']),
        row('team-2-cygnet', ['team-2'], ['loc-cygnet-room']),
        row('photos-lobby', ['team-photographers'], ['loc-L2-Lobby']),
        row('talk-cygnet', [], ['loc-cygnet-room'], 'agenda'),
        row('talk-black-swan-photographed', ['team-photographers'], ['loc-black-swan-room'], 'agenda'),
    ]
    const ids = (teams: string[], locations: string[], showAgenda = false) =>
        filterRunsheetItems(rows, { teams, locations, showAgenda }).map((item) => item.id)

    it('ORs within a field and ANDs across them', () => {
        expect(ids(['team-photographers', 'team-1'], [])).toEqual([
            'photos-black-swan',
            'team-1-cygnet',
            'photos-lobby',
            'talk-black-swan-photographed',
        ])
        expect(ids(['team-photographers', 'team-1'], ['loc-black-swan-room', 'loc-cygnet-room'])).toEqual([
            'photos-black-swan',
            'team-1-cygnet',
            'talk-black-swan-photographed',
        ])
    })

    it('hides agenda sessions from a team filter unless the agenda is selected too', () => {
        expect(ids(['team-1'], [])).toEqual(['team-1-cygnet'])
        expect(ids(['team-1', 'agenda'], [])).toEqual(['team-1-cygnet', 'talk-cygnet', 'talk-black-swan-photographed'])
    })

    it('still applies the location filter to agenda sessions', () => {
        expect(ids(['agenda'], ['loc-cygnet-room'])).toEqual(['talk-cygnet'])
    })

    it('shows every agenda session when Show Agenda is on, whatever else is selected', () => {
        expect(ids(['team-1'], ['loc-L2-Lobby'])).toEqual([])
        expect(ids(['team-1'], ['loc-L2-Lobby'], true)).toEqual(['talk-cygnet', 'talk-black-swan-photographed'])
        expect(ids(['team-1'], [], true)).toEqual(['team-1-cygnet', 'talk-cygnet', 'talk-black-swan-photographed'])
    })

    it('shows everything when nothing is selected', () => {
        expect(ids([], [])).toHaveLength(rows.length)
    })
})

describe('labelsInUse', () => {
    it('keeps only the labels some item carries, in config order', () => {
        expect(labelsInUse(config.teamLabels, ['team-photographers', 'team-unknown', 'team-photographers'])).toEqual({
            'team-photographers': 'Photographers',
        })
        expect(labelsInUse(config.locationLabels, [])).toEqual({})
    })
})

describe('groupRunsheetSections', () => {
    it('is one unheaded section without a sectionOf', () => {
        expect(groupRunsheetSections(['a', 'b'], undefined)).toEqual([{ heading: null, items: ['a', 'b'] }])
    })

    it('splits by heading in first-appearance order', () => {
        const day = (item: string) => item.split(' ')[0]
        expect(groupRunsheetSections(['Fri 1', 'Fri 2', 'Sat 1'], day)).toEqual([
            { heading: 'Fri', items: ['Fri 1', 'Fri 2'] },
            { heading: 'Sat', items: ['Sat 1'] },
        ])
    })

    it('gathers a heading that recurs into its first section, so no heading appears twice', () => {
        const day = (item: string) => item.split(' ')[0]
        expect(groupRunsheetSections(['Fri 1', 'TBC 1', 'Fri 2', 'TBC 2'], day)).toEqual([
            { heading: 'Fri', items: ['Fri 1', 'Fri 2'] },
            { heading: 'TBC', items: ['TBC 1', 'TBC 2'] },
        ])
    })
})
