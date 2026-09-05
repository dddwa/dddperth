import { describe, expect, it } from 'vitest'
import { pastYearsList } from './jira-client.server'

/**
 * The sync's JQL selects "this year OR not yet year-labelled", expressed as
 * "not labelled with a PAST year" because JQL has no "matches a year-shaped
 * label" predicate. `{pastYears}` is what makes that expressible without a
 * hand-maintained year list in fork config, so it's worth pinning down.
 */
describe('pastYearsList', () => {
    it('lists the ten years before the given one, quoted for JQL', () => {
        expect(pastYearsList('2026')).toBe(
            '"2016", "2017", "2018", "2019", "2020", "2021", "2022", "2023", "2024", "2025"',
        )
    })

    it('never includes the current year — that arm is matched separately', () => {
        expect(pastYearsList('2026')).not.toContain('"2026"')
    })

    it('never includes future years, so next year\'s issues still sync early', () => {
        expect(pastYearsList('2026')).not.toContain('"2027"')
    })

    it('degrades to a harmless list rather than emitting broken JQL', () => {
        // A malformed year must not produce `labels NOT IN ()`, which is a
        // JQL syntax error and would fail every sync rather than one issue.
        expect(pastYearsList('not-a-year')).toBe('"0000"')
    })
})
