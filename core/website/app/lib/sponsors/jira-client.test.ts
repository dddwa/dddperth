import { describe, expect, it } from 'vitest'
import { assignedRoom, planJiraFieldValue } from './jira-client.server'

const allowedValues = [
    { id: '1', value: 'Current A' },
    { id: '2', value: 'Current B' },
]

describe('planJiraFieldValue', () => {
    it('preserves an unknown legacy single-select value', () => {
        expect(planJiraFieldValue({ schema: { type: 'option' }, allowedValues }, 'Legacy')).toEqual({
            action: 'skip',
        })
    })

    it('preserves a checkbox field when any stored option is now unknown', () => {
        expect(planJiraFieldValue({ schema: { type: 'array' }, allowedValues }, 'Current A, Legacy')).toEqual({
            action: 'skip',
        })
    })

    it('still clears options when the sponsor explicitly leaves them blank', () => {
        expect(planJiraFieldValue({ schema: { type: 'option' }, allowedValues }, '')).toEqual({
            action: 'set',
            value: null,
        })
        expect(planJiraFieldValue({ schema: { type: 'array' }, allowedValues }, undefined)).toEqual({
            action: 'set',
            value: [],
        })
    })
})

describe('assignedRoom', () => {
    /**
     * A fork whose room field carries a Jira default reads back the same value
     * on every issue, assigned or not — showing that would be worse than
     * showing nothing, since a sponsor could turn up at the wrong room. DDD
     * Perth cleared its default, so it configures no unassigned value; this
     * keeps the escape hatch honest for forks that can't.
     */
    it('treats a configured default as unassigned', () => {
        expect(assignedRoom('Sports Lounge', 'Sports Lounge')).toBeUndefined()
    })

    it('passes through a room the committee actually picked', () => {
        expect(assignedRoom('River View Room 2', 'Sports Lounge')).toBe('River View Room 2')
    })

    it('treats an empty field as unassigned', () => {
        expect(assignedRoom(undefined, 'Sports Lounge')).toBeUndefined()
        expect(assignedRoom('', 'Sports Lounge')).toBeUndefined()
    })

    /** A fork whose field has no default configures no unassigned value. */
    it('accepts any non-empty value when no default is configured', () => {
        expect(assignedRoom('Sports Lounge')).toBe('Sports Lounge')
    })
})
