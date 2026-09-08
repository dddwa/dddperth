import { describe, expect, it } from 'vitest'
import { planJiraFieldValue } from './jira-client.server'

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
