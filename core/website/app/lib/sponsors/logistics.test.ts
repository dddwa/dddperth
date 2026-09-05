import { describe, expect, it } from 'vitest'
import {
    BUMP_IN_SLOTS,
    BUMP_OUT_WINDOWS,
    filterByVisibility,
    logisticsSchema,
    logisticsVisibility,
    LOGISTICS_KEYS,
    PARKING_OPTIONS,
    SCREEN_OPTIONS,
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
        screenNotes: 'Near the door',
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
    it('keeps additionalNotes out of Jira — it is spreadsheet-only', () => {
        // No `logistics.additionalNotes` mapping exists in fork config, so a
        // key added here without one silently stops reaching the export.
        expect(LOGISTICS_KEYS).toContain('additionalNotes')
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
