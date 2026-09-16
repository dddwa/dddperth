import { describe, expect, it } from 'vitest'
import {
    BUMP_IN_SLOTS,
    BUMP_OUT_WINDOWS,
    filterByVisibility,
    logisticsSchema,
    logisticsVisibility,
    LOGISTICS_KEYS,
    PARKING_OPTIONS,
    prefilledLogistics,
    readSubmittedLogistics,
    SCREEN_OPTIONS,
    optionsIncludingStored,
    visibleLogisticsKeys,
    type LogisticsFields,
} from './logistics'

describe('logisticsVisibility', () => {
    it('shows exhibition sections to tiers with a booth', () => {
        for (const tier of ['platinum', 'gold', 'room', 'community']) {
            const visibility = logisticsVisibility(tier)
            expect(visibility.exhibition, tier).toBe(true)
            expect(visibility.screens, tier).toBe(true)
            expect(visibility.induction, tier).toBe(true)
        }
    })

    it('hides exhibition sections from tiers without one', () => {
        for (const tier of ['coffeecart', 'digital', 'raffleonly']) {
            const visibility = logisticsVisibility(tier)
            expect(visibility.exhibition, tier).toBe(false)
            expect(visibility.screens, tier).toBe(false)
        }
    })

    it('offers the raffle and social quote to every tier', () => {
        for (const tier of ['platinum', 'digital', 'raffleonly', undefined]) {
            const visibility = logisticsVisibility(tier)
            expect(visibility.raffle, String(tier)).toBe(true)
            expect(visibility.socialQuote, String(tier)).toBe(true)
        }
    })

    it('shows an unmapped tier too much rather than too little', () => {
        // A new Jira tier nobody has added to tierMap yet: a sponsor seeing an
        // irrelevant section can skip it, but one who never sees bump-in has
        // no way to tell us when they're arriving.
        const visibility = logisticsVisibility('brand-new-tier')
        expect(visibility.exhibition).toBe(true)
    })

    it('is case-insensitive about the tier key', () => {
        expect(logisticsVisibility('Platinum').exhibition).toBe(true)
        expect(logisticsVisibility('DIGITAL').exhibition).toBe(false)
    })
})

describe('filterByVisibility', () => {
    const filled: LogisticsFields = {
        exhibitorContactName: 'Wile E. Coyote',
        exhibitorContactPhone: '0400 000 000',
        exhibitorContactEmail: 'a@example.com',
        bumpInSlot: 'Friday 1pm - 2pm',
        bumpOutWindow: 'Saturday 4pm',
        bumpInAttendees: 'Someone',
        loadingDockAttendees: 'Someone else',
        equipmentList: 'Banner',
        nonLaptopElectrical: 'Lamp',
        trolleyOrForklift: 'Trolley',
        loadingDockAssistance: 'Yes',
        porterAssistance: 'No',
        parking: 'For Bump In',
        screenOrders: '55" LCD',
        screenInvoicingEmail: 'ap@example.com',
        rafflePrize: 'Keyboard',
        raffleLocation: 'Main stage',
        socialQuote: 'Delighted to sponsor',
    }

    it('keeps everything for a booth tier', () => {
        const result = filterByVisibility(filled, logisticsVisibility('platinum'))
        expect(result).toEqual(filled)
    })

    it('drops exhibition and screen answers for a tier without a booth', () => {
        const result = filterByVisibility(filled, logisticsVisibility('digital'))

        expect(result.bumpInSlot).toBeUndefined()
        expect(result.equipmentList).toBeUndefined()
        expect(result.screenOrders).toBeUndefined()
        expect(result.exhibitorContactName).toBeUndefined()

        // Raffle and the social quote survive — every tier can supply those.
        expect(result.rafflePrize).toBe('Keyboard')
        expect(result.socialQuote).toBe('Delighted to sponsor')
    })

    it('protects against a hand-crafted POST for a hidden section', () => {
        // The action re-derives visibility server-side, so submitting
        // exhibition fields as a Digital sponsor must not persist them.
        const result = filterByVisibility({ bumpInSlot: 'Friday 1pm - 2pm' }, logisticsVisibility('digital'))
        expect(result.bumpInSlot).toBeUndefined()
    })

    it('keeps exhibition answers for a community sponsor — in-kind sponsors bump in too', () => {
        const result = filterByVisibility(filled, logisticsVisibility('community'))
        expect(result.bumpInSlot).toBe('Friday 1pm - 2pm')
        expect(result.equipmentList).toBe('Banner')
    })
})

describe('prefilledLogistics', () => {
    const fromJira = {
        bumpInSlot: 'Friday 1pm - 2pm',
        screenOrders: '55" LCD ($500+GST)',
        socialQuote: 'Committee-collected quote',
    }

    it('fills the form from Jira before the sponsor has ever submitted', () => {
        // iCetana's screen order and bump-in slot were collected by email and
        // sat invisible in Jira; the sponsor saw an empty form.
        expect(prefilledLogistics({ profile: null, jiraLogistics: fromJira })).toEqual(fromJira)
    })

    it("prefers the sponsor's own answer over Jira's before submission", () => {
        const result = prefilledLogistics({
            profile: { logistics: { bumpInSlot: 'Friday 4pm - 5pm' } },
            jiraLogistics: fromJira,
        })

        expect(result.bumpInSlot).toBe('Friday 4pm - 5pm')
        expect(result.screenOrders).toBe('55" LCD ($500+GST)')
    })

    it('hands authority to the sponsor wholesale once they submit', () => {
        // Not per field: after a submission the form is their answers alone,
        // matching buildExhibitorSource so the form and the venue export
        // can never disagree about who owns a value.
        const result = prefilledLogistics({
            profile: { logistics: { bumpInSlot: 'Friday 4pm - 5pm' }, logisticsUpdatedAt: 1 },
            jiraLogistics: fromJira,
        })

        expect(result).toEqual({ bumpInSlot: 'Friday 4pm - 5pm' })
    })

    it('keeps a deliberately cleared field cleared', () => {
        // The regression that makes wholesale authority necessary: a per-field
        // merge would resurrect the Jira value on the next page load.
        const result = prefilledLogistics({
            profile: { logistics: {}, logisticsUpdatedAt: 1 },
            jiraLogistics: fromJira,
        })

        expect(result.screenOrders).toBeUndefined()
        expect(result).toEqual({})
    })

    it('prefills nothing when Jira holds nothing', () => {
        expect(prefilledLogistics({ profile: null, jiraLogistics: undefined })).toEqual({})
        expect(prefilledLogistics({ profile: null, jiraLogistics: {} })).toEqual({})
    })
})

describe('readSubmittedLogistics', () => {
    it('does not count a checkbox group the form never showed', () => {
        // The bug the browser walkthrough found: collapsing the groups
        // unconditionally made every save look like it cleared both, so a
        // sponsor saving their raffle prize wiped the committee's screen order.
        const formData = new FormData()
        formData.set('rafflePrize', 'Keyboard')

        const submitted = readSubmittedLogistics(formData)

        expect(submitted.has('rafflePrize')).toBe(true)
        expect(submitted.has('screenOrders')).toBe(false)
        expect(submitted.has('parking')).toBe(false)
    })

    it('counts a group the sponsor unticked entirely, so it can be cleared', () => {
        // An all-unticked group posts no `name[]`, which is why the form
        // renders a hidden presence marker alongside it.
        const formData = new FormData()
        formData.set('screenOrders__present', '1')

        const submitted = readSubmittedLogistics(formData)

        expect(submitted.has('screenOrders')).toBe(true)
        expect(formData.get('screenOrders')).toBe('')
    })

    it('collapses ticked options into the comma-joined string Jira expects', () => {
        const formData = new FormData()
        formData.set('parking__present', '1')
        formData.append('parking[]', 'For Bump In')
        formData.append('parking[]', 'For Bump Out')

        const submitted = readSubmittedLogistics(formData)

        expect(submitted.has('parking')).toBe(true)
        expect(formData.get('parking')).toBe('For Bump In, For Bump Out')
        expect(formData.has('parking[]')).toBe(false)
        expect(formData.has('parking__present')).toBe(false)
    })

    it('treats a submitted-but-blank text field as submitted', () => {
        // Deliberate removal, as distinct from never being asked.
        const formData = new FormData()
        formData.set('rafflePrize', '')

        expect(readSubmittedLogistics(formData).has('rafflePrize')).toBe(true)
    })

    it('ignores form keys that are not logistics fields', () => {
        const formData = new FormData()
        formData.set('_action', 'save')
        formData.set('csrf', 'token')

        expect([...readSubmittedLogistics(formData)]).toEqual([])
    })
})

describe('visibleLogisticsKeys', () => {
    it('lists what a booth tier can see', () => {
        const keys = visibleLogisticsKeys(logisticsVisibility('platinum'))
        expect(keys.has('bumpInSlot')).toBe(true)
        expect(keys.has('screenOrders')).toBe(true)
        expect(keys.has('rafflePrize')).toBe(true)
        expect(keys.has('socialQuote')).toBe(true)
    })

    it('excludes hidden sections, so a crafted POST cannot clear them in Jira', () => {
        const keys = visibleLogisticsKeys(logisticsVisibility('digital'))
        expect(keys.has('bumpInSlot')).toBe(false)
        expect(keys.has('screenOrders')).toBe(false)
        expect(keys.has('equipmentList')).toBe(false)

        // Raffle and the social quote are open to every tier.
        expect(keys.has('rafflePrize')).toBe(true)
        expect(keys.has('socialQuote')).toBe(true)
    })

    it('never names a key that is not a real logistics field', () => {
        for (const key of visibleLogisticsKeys(logisticsVisibility('platinum'))) {
            expect(LOGISTICS_KEYS).toContain(key)
        }
    })
})

describe('logisticsSchema', () => {
    it('accepts a completely empty form — nothing is required up front', () => {
        const parsed = logisticsSchema.safeParse({})
        expect(parsed.success).toBe(true)
    })

    it('treats blank strings as unanswered rather than empty answers', () => {
        const parsed = logisticsSchema.safeParse({ bumpInSlot: '   ', rafflePrize: '' })
        expect(parsed.success).toBe(true)
        if (parsed.success) {
            expect(parsed.data.bumpInSlot).toBeUndefined()
            expect(parsed.data.rafflePrize).toBeUndefined()
        }
    })

    it('rejects a malformed invoicing email, so the venue can actually bill them', () => {
        const parsed = logisticsSchema.safeParse({ screenInvoicingEmail: 'not-an-email' })
        expect(parsed.success).toBe(false)
    })

    it('trims answers so stray whitespace never reaches Jira', () => {
        const parsed = logisticsSchema.safeParse({ equipmentList: '  1x banner  ' })
        expect(parsed.success).toBe(true)
        if (parsed.success) expect(parsed.data.equipmentList).toBe('1x banner')
    })
})

describe('dropdown options', () => {
    it('retains stored values that no longer appear in Jira configuration', () => {
        expect(optionsIncludingStored(['Current A', 'Current B'], ['Legacy', 'Current A'])).toEqual([
            'Current A',
            'Current B',
            'Legacy',
        ])
    })

    it('keeps additionalNotes out of Jira — it is spreadsheet-only', () => {
        // No `logistics.additionalNotes` mapping exists in fork config, so a
        // key added here without one silently stops reaching the export.
        expect(LOGISTICS_KEYS).toContain('additionalNotes')
    })

    it('does not collect screen ordering notes — that field is committee-owned', () => {
        // customfield_10163 holds the committee's own running note ("informed
        // PAV - 23/8"). Collecting it would show sponsors internal shorthand,
        // and a portal save would overwrite it. Re-adding the key here without
        // reinstating the fork-config mapping would silently do neither.
        expect(LOGISTICS_KEYS).not.toContain('screenNotes')
        expect(Object.keys(logisticsSchema.shape)).not.toContain('screenNotes')
    })

    it('offers every Jira bump-in slot, including the Saturday early option', () => {
        expect(BUMP_IN_SLOTS).toHaveLength(7)
        expect(BUMP_IN_SLOTS).toContain('Friday noon - 1pm')
        expect(BUMP_IN_SLOTS).toContain('Saturday 6.30am to 7am (minimal set-up only)')
    })

    it('offers every Jira bump-out window', () => {
        expect(BUMP_OUT_WINDOWS).toEqual([
            'During afternoon tea (room sponsors only)',
            'Saturday 4pm',
            'Saturday 5pm (after conference concludes)',
        ])
    })

    it('keeps screen options priced, so sponsors see the cost before ordering', () => {
        expect(SCREEN_OPTIONS.every((option) => option.includes('+GST'))).toBe(true)
    })

    it('round-trips a multi-checkbox answer through the comma-joined string', () => {
        const joined = [...PARKING_OPTIONS].join(', ')
        const parsed = logisticsSchema.safeParse({ parking: joined })
        expect(parsed.success).toBe(true)
        if (parsed.success) expect(parsed.data.parking).toBe('For Bump In, For Bump Out')
    })
})
