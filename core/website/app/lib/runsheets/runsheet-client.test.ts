import { describe, expect, it } from 'vitest'
import { LOCATION_LABELS, parseRunsheetFilter, TEAM_LABELS } from './runsheet-client.server'

/**
 * `/runsheets` is a public, unauthenticated page, and the `$filter` path
 * segment is the only caller-controlled value that varies the JQL sent to
 * Jira. `parseRunsheetFilter` is the boundary that keeps caller text out of
 * the query entirely: it either matches a known label or returns null.
 */
describe('parseRunsheetFilter', () => {
    it('accepts a known team', () => {
        expect(parseRunsheetFilter('team.team-1')).toEqual({ kind: 'team', value: 'team-1' })
    })

    it('accepts a known location', () => {
        expect(parseRunsheetFilter('location.loc-cygnet-room')).toEqual({
            kind: 'location',
            value: 'loc-cygnet-room',
        })
    })

    it('accepts every label offered in the filter dropdown', () => {
        // The dropdown is built from these maps, so anything it can submit has
        // to survive the round trip through the URL.
        for (const label of Object.keys(TEAM_LABELS)) {
            expect(parseRunsheetFilter(`team.${label}`)).toEqual({ kind: 'team', value: label })
        }
        for (const label of Object.keys(LOCATION_LABELS)) {
            expect(parseRunsheetFilter(`location.${label}`)).toEqual({ kind: 'location', value: label })
        }
    })

    it('returns null for no filter', () => {
        expect(parseRunsheetFilter(undefined)).toBeNull()
        expect(parseRunsheetFilter('')).toBeNull()
    })

    it('rejects an unknown label rather than passing it through', () => {
        expect(parseRunsheetFilter('team.team-999')).toBeNull()
        expect(parseRunsheetFilter('location.loc-nowhere')).toBeNull()
    })

    it('rejects an unknown kind', () => {
        expect(parseRunsheetFilter('assignee.someone')).toBeNull()
        expect(parseRunsheetFilter('team-1')).toBeNull()
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
            expect(parseRunsheetFilter(attack)).toBeNull()
        }
    })

    it('does not treat inherited Object properties as labels', () => {
        // A plain-object lookup would say `'constructor' in TEAM_LABELS`.
        expect(parseRunsheetFilter('team.constructor')).toBeNull()
        expect(parseRunsheetFilter('team.toString')).toBeNull()
        expect(parseRunsheetFilter('team.__proto__')).toBeNull()
    })

    it('splits on the first separator only, so a dotted label stays intact', () => {
        // No current label contains a dot, but splitting on the last one (or
        // on every one) would silently corrupt any that did.
        expect(parseRunsheetFilter('team.team.1')).toBeNull()
    })
})
