import { describe, expect, it } from 'vitest'
import { buildLogisticsPayload, planJiraFieldValue } from './jira-client.server'

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

describe('buildLogisticsPayload', () => {
    const mapping = {
        bumpInSlot: 'cf_bump',
        equipmentList: 'cf_equipment',
        socialQuote: 'cf_quote',
        screenOrders: 'cf_screens',
    }
    const editMetaFields = {
        cf_bump: { schema: { type: 'option' }, allowedValues: [{ id: '1', value: 'Friday 1pm - 2pm' }] },
        cf_equipment: { schema: { type: 'string' } },
        cf_quote: { schema: { type: 'string', custom: 'com.atlassian…:textarea' } },
        cf_screens: { schema: { type: 'array' }, allowedValues: [{ id: '9', value: '55" LCD ($500+GST)' }] },
    }
    const build = (logistics: Record<string, string>, submitted: string[]) =>
        buildLogisticsPayload({ mapping, editMetaFields, logistics, submittedKeys: new Set(submitted) })

    it('leaves a field the sponsor never answered completely alone', () => {
        // The regression this exists for: the committee collects most
        // logistics by email, and the push used to plan `undefined` as a
        // clear — so one sponsor save wiped every value Aaron had gathered.
        const payload = build({ equipmentList: 'Banner' }, ['equipmentList'])

        expect(payload).toEqual({ cf_equipment: 'Banner' })
        expect(payload).not.toHaveProperty('cf_bump')
        expect(payload).not.toHaveProperty('cf_quote')
        expect(payload).not.toHaveProperty('cf_screens')
    })

    it('clears a field the sponsor submitted empty', () => {
        // Submitted-but-blank is a deliberate removal, so it must reach Jira.
        expect(build({}, ['equipmentList'])).toEqual({ cf_equipment: null })
        expect(build({}, ['bumpInSlot'])).toEqual({ cf_bump: null })
        expect(build({}, ['socialQuote'])).toEqual({ cf_quote: null })
        expect(build({}, ['screenOrders'])).toEqual({ cf_screens: [] })
    })

    it('tells never-answered and explicitly-cleared apart for the same field', () => {
        expect(build({}, [])).toEqual({})
        expect(build({}, ['equipmentList'])).toEqual({ cf_equipment: null })
    })

    it('writes answered fields in the shape their Jira field expects', () => {
        const payload = build(
            { bumpInSlot: 'Friday 1pm - 2pm', screenOrders: '55" LCD ($500+GST)', equipmentList: 'Banner' },
            ['bumpInSlot', 'screenOrders', 'equipmentList'],
        )

        expect(payload.cf_bump).toEqual({ id: '1' })
        expect(payload.cf_screens).toEqual([{ id: '9' }])
        expect(payload.cf_equipment).toBe('Banner')
    })

    it('skips a field missing from editmeta, keeping the rest of the save', () => {
        // Including it would 400 the whole request and lose every answer.
        const payload = buildLogisticsPayload({
            mapping,
            editMetaFields: { cf_equipment: { schema: { type: 'string' } } },
            logistics: { bumpInSlot: 'Friday 1pm - 2pm', equipmentList: 'Banner' },
            submittedKeys: new Set(['bumpInSlot', 'equipmentList']),
        })

        expect(payload).toEqual({ cf_equipment: 'Banner' })
    })

    it('never touches a field with no Jira mapping', () => {
        // screenNotes is committee-owned and deliberately unmapped; a stale
        // value in D1 must not resurrect a write to it.
        const payload = buildLogisticsPayload({
            mapping: { ...mapping, screenNotes: undefined },
            editMetaFields: { ...editMetaFields, cf_notes: { schema: { type: 'string' } } },
            logistics: { screenNotes: 'informed PAV - 23/8' },
            submittedKeys: new Set(['screenNotes']),
        })

        expect(payload).toEqual({})
    })

    it('produces nothing when the sponsor submitted nothing', () => {
        expect(buildLogisticsPayload({ mapping, editMetaFields, logistics: {}, submittedKeys: new Set() })).toEqual({})
    })

    it('preserves an unknown legacy option rather than clearing it', () => {
        // A value Jira no longer offers is skipped, not nulled — the
        // committee may have retired the option after the sponsor answered.
        expect(build({ bumpInSlot: 'Thursday 9am (retired)' }, ['bumpInSlot'])).toEqual({})
    })
})
