import { conferenceManifest } from '@conference/manifest'
import { describe, expect, it } from 'vitest'
import { parseRunsheetFilter } from './runsheet-client.server'

/**
 * `/runsheets` is a public, unauthenticated page, and the `$filter` path
 * segment is the only caller-controlled value that varies the JQL sent to
 * Jira. `parseRunsheetFilter` is the boundary that keeps caller text out of
 * the query entirely: it either matches a label the fork configured or
 * returns null.
 */

/** A minimal fork config — the parser only reads the two label maps. */
const config = {
    teamLabels: { 'team-1': 'Team 1', 'team-photographers': 'Photographers' },
    locationLabels: { 'loc-cygnet-room': 'Cygnet Room', 'loc-L2-Lobby': 'Lobby Level 2' },
}

describe('parseRunsheetFilter', () => {
    it('accepts a configured team', () => {
        expect(parseRunsheetFilter('team.team-1', config)).toEqual({ kind: 'team', value: 'team-1' })
    })

    it('accepts a configured location', () => {
        expect(parseRunsheetFilter('location.loc-cygnet-room', config)).toEqual({
            kind: 'location',
            value: 'loc-cygnet-room',
        })
    })

    it('returns null for no filter', () => {
        expect(parseRunsheetFilter(undefined, config)).toBeNull()
        expect(parseRunsheetFilter('', config)).toBeNull()
    })

    it('rejects a label this fork has not configured', () => {
        // Present in DDD Perth's real config but not in this fixture — the
        // allowlist is the config, not a constant baked into core.
        expect(parseRunsheetFilter('team.team-5', config)).toBeNull()
        expect(parseRunsheetFilter('location.loc-sports-lounge', config)).toBeNull()
    })

    it('rejects an unknown kind', () => {
        expect(parseRunsheetFilter('assignee.someone', config)).toBeNull()
        expect(parseRunsheetFilter('team-1', config)).toBeNull()
    })

    it('rejects JQL injection attempts', () => {
        // Each of these would change the query's meaning if interpolated.
        const attacks = [
            'team.team-1" OR "1"="1',
            'team.team-1 OR project = SPN',
            'location.loc-cygnet-room") OR (reporter != null',
            'team.team-1\nAND assignee != null',
        ]
        for (const attack of attacks) {
            expect(parseRunsheetFilter(attack, config)).toBeNull()
        }
    })

    it('does not treat inherited Object properties as labels', () => {
        // A plain `in` check would say `'constructor' in config.teamLabels`.
        expect(parseRunsheetFilter('team.constructor', config)).toBeNull()
        expect(parseRunsheetFilter('team.toString', config)).toBeNull()
        expect(parseRunsheetFilter('team.__proto__', config)).toBeNull()
    })

    it('splits on the first separator only, so a dotted label stays intact', () => {
        // No current label contains a dot, but splitting on the last one (or
        // on every one) would silently corrupt any that did.
        expect(parseRunsheetFilter('team.team.1', config)).toBeNull()
    })
})

describe("this fork's runsheets config", () => {
    const forkConfig = conferenceManifest.runsheets

    it('accepts every label its own filter dropdown offers', () => {
        // The dropdown is built from these maps, so anything it can submit
        // has to survive the round trip through the URL. Skipped for a fork
        // with no volunteer board — /runsheets 404s there.
        if (!forkConfig) return

        for (const label of Object.keys(forkConfig.teamLabels)) {
            expect(parseRunsheetFilter(`team.${label}`, forkConfig)).toEqual({ kind: 'team', value: label })
        }
        for (const label of Object.keys(forkConfig.locationLabels)) {
            expect(parseRunsheetFilter(`location.${label}`, forkConfig)).toEqual({
                kind: 'location',
                value: label,
            })
        }
    })
})
