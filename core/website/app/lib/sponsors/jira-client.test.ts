import { conferenceManifest } from '@conference/manifest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    assignedRoom,
    buildLogisticsPayload,
    createJiraClient,
    planJiraFieldValue,
    textToAdf,
} from './jira-client.server'

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

    it('fails when a submitted field is not editable in Jira', () => {
        expect(() =>
            buildLogisticsPayload({
                mapping,
                editMetaFields: { cf_equipment: { schema: { type: 'string' } } },
                logistics: { bumpInSlot: 'Friday 1pm - 2pm', equipmentList: 'Banner' },
                submittedKeys: new Set(['bumpInSlot', 'equipmentList']),
            }),
        ).toThrow('Jira field for "bumpInSlot" is not editable')
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

    it('fails when Jira cannot accept a submitted select value', () => {
        expect(() => build({ bumpInSlot: 'Thursday 9am (retired)' }, ['bumpInSlot'])).toThrow(
            'Jira cannot accept "Thursday 9am (retired)" for "bumpInSlot"',
        )
    })

    it('preserves an unknown legacy select value when it was not submitted', () => {
        expect(build({ bumpInSlot: 'Thursday 9am (retired)' }, [])).toEqual({})
    })

    it('fails the entire payload when one submitted checkbox option is invalid', () => {
        expect(() =>
            build({ equipmentList: 'Banner', screenOrders: '55" LCD ($500+GST), Unknown screen' }, [
                'equipmentList',
                'screenOrders',
            ]),
        ).toThrow('Jira cannot accept')
    })
})

describe('pushLogistics', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('rejects an invalid select before sending any Jira update', async () => {
        const portalConfig = conferenceManifest.sponsorPortal
        const fieldId = portalConfig?.jira.fields.logistics?.bumpInSlot
        if (!portalConfig || !fieldId) throw new Error('Expected sponsor logistics config')
        const fetchMock = vi.fn<typeof fetch>(async () =>
            Response.json({
                fields: {
                    [fieldId]: { schema: { type: 'option' }, allowedValues: [{ id: '1', value: 'Friday 1pm - 2pm' }] },
                },
            }),
        )
        vi.stubGlobal('fetch', fetchMock)
        const client = createJiraClient({ portalConfig, apiEmail: 'test@example.com', apiToken: 'test' })

        await expect(
            client.pushLogistics('SPN-1', { bumpInSlot: 'Friday afternoon' }, new Set(['bumpInSlot'])),
        ).rejects.toThrow('Jira cannot accept "Friday afternoon" for "bumpInSlot"')
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(fetchMock.mock.calls[0][0]).toContain('/editmeta')
    })
})

describe('searchSponsorIssues', () => {
    afterEach(() => vi.unstubAllGlobals())

    it('reads Jira field shapes and retains mapped blank keys for portal clears', async () => {
        const portalConfig = conferenceManifest.sponsorPortal
        if (!portalConfig) throw new Error('Sponsor portal config is required for this test')
        const fields = portalConfig.jira.fields
        const logistics = fields.logistics
        const quoteField = fields.quote
        const linkedInField = fields.socials?.linkedin
        const { bumpInSlot, screenOrders, socialQuote, rafflePrize } = logistics ?? {}
        if (!quoteField || !linkedInField || !bumpInSlot || !screenOrders || !socialQuote || !rafflePrize) {
            throw new Error('Expected Jira field mappings are required for this test')
        }
        const fetchMock = vi.fn<typeof fetch>(async () =>
            Response.json({
                isLast: true,
                issues: [
                    {
                        key: 'SPN-1',
                        fields: {
                            [fields.companyName]: 'Acme',
                            [fields.tier]: { id: 'tier', value: 'Gold' },
                            [fields.website]: 'https://acme.test',
                            [fields.contactEmail]: 'Sponsor@Example.com',
                            [quoteField]: textToAdf('Committee blurb'),
                            [linkedInField]: 'https://linkedin.com/company/acme',
                            [bumpInSlot]: { id: 'slot', value: 'Friday 1pm - 2pm' },
                            [screenOrders]: [{ id: 'screen', value: '55" LCD ($500+GST)' }],
                            [socialQuote]: textToAdf('Social quote from Jira'),
                            [rafflePrize]: null,
                        },
                    },
                ],
            }),
        )
        vi.stubGlobal('fetch', fetchMock)
        const client = createJiraClient({ portalConfig, apiEmail: 'test@example.com', apiToken: 'test' })

        const [sponsor] = await client.searchSponsorIssues()

        expect(sponsor).toMatchObject({
            companyName: 'Acme',
            tier: 'Gold',
            website: 'https://acme.test',
            quote: 'Committee blurb',
            socials: { linkedin: 'https://linkedin.com/company/acme' },
            contactEmails: ['sponsor@example.com'],
            logistics: {
                bumpInSlot: 'Friday 1pm - 2pm',
                screenOrders: '55" LCD ($500+GST)',
                socialQuote: 'Social quote from Jira',
            },
        })
        expect(sponsor.logistics).not.toHaveProperty('rafflePrize')
        expect(sponsor.logisticsKeys).toContain('rafflePrize')
        const requestBody = fetchMock.mock.calls.at(0)?.[1]?.body
        if (typeof requestBody !== 'string') throw new Error('Expected Jira request body')
        const request = JSON.parse(requestBody)
        expect(request.fields).toContain(quoteField)
        expect(request.fields).toContain(socialQuote)
    })

    it('fetches every Jira page before returning the authoritative result set', async () => {
        const fetchMock = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({ issues: [{ key: 'SPN-1', fields: {} }], nextPageToken: 'page-2', isLast: false }),
            )
            .mockResolvedValueOnce(Response.json({ issues: [{ key: 'SPN-2', fields: {} }], isLast: true }))
        vi.stubGlobal('fetch', fetchMock)
        const portalConfig = conferenceManifest.sponsorPortal
        if (!portalConfig) throw new Error('Sponsor portal config is required for this test')
        const client = createJiraClient({
            portalConfig,
            apiEmail: 'test@example.com',
            apiToken: 'test',
        })

        expect((await client.searchSponsorIssues()).map((sponsor) => sponsor.issueKey)).toEqual(['SPN-1', 'SPN-2'])
        const requestBody = fetchMock.mock.calls.at(1)?.[1]?.body
        if (typeof requestBody !== 'string') throw new Error('Expected second Jira request body')
        expect(JSON.parse(requestBody).nextPageToken).toBe('page-2')
    })
})
