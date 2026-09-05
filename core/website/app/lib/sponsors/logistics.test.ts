import { describe, expect, it } from 'vitest'
import { filterByVisibility, logisticsSchema, logisticsVisibility, type LogisticsFields } from './logistics'

describe('logisticsVisibility', () => {
    it('shows exhibition sections to tiers with a booth', () => {
        for (const tier of ['platinum', 'gold', 'room']) {
            const visibility = logisticsVisibility(tier)
            expect(visibility.exhibition, tier).toBe(true)
            expect(visibility.screens, tier).toBe(true)
            expect(visibility.induction, tier).toBe(true)
        }
    })

    it('hides exhibition sections from tiers without one', () => {
        for (const tier of ['coffeecart', 'digital', 'community', 'raffleonly']) {
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
        const result = filterByVisibility({ bumpInSlot: 'Friday 1pm - 2pm' }, logisticsVisibility('community'))
        expect(result.bumpInSlot).toBeUndefined()
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
