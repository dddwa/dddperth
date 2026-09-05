import { z } from 'zod'

/**
 * The sponsor-supplied logistics the portal collects on behalf of the
 * committee: exhibition/bump-in, raffle, Optus screen orders and induction.
 *
 * Every field here is sponsor-owned — Jira's own status options label each of
 * these workstreams "… Pending (Sponsor)". Like blurb and socials, the
 * portal's value wins and is pushed into Jira on every save; the committee
 * owns the *status* fields that track them, never the answers.
 *
 * Pure: no platform imports, unit-testable in node.
 */

/**
 * Tiers with a physical exhibition space. Anything bump-in/out, equipment,
 * loading-dock or screen-related only applies to these — a Digital or
 * Community sponsor has no booth to load in.
 *
 * These are `YearSponsors` category keys (the mapped side of the manifest's
 * tierMap), not raw Jira tier values, so a rename in Jira doesn't silently
 * change who sees the form.
 */
export const BOOTH_TIERS = ['platinum', 'gold', 'room'] as const

/** Which sections a sponsor sees, by mapped tier. */
export interface LogisticsVisibility {
    /** Bump-in/out, equipment, loading dock, parking. */
    exhibition: boolean
    /** Optus-supplied TV screen orders — needs a booth to put them in. */
    screens: boolean
    /** Safety induction for people attending bump-in. */
    induction: boolean
    /** Any tier can donate a prize, including Raffle Only. */
    raffle: boolean
    /** Quote for the committee's social posts — every sponsor. */
    socialQuote: boolean
}

/**
 * Sections visible to a sponsor on the given (mapped) tier.
 *
 * An unmapped or unknown tier gets the exhibition sections. That's deliberate:
 * a new Jira tier option that nobody has added to tierMap yet should show a
 * sponsor too much rather than too little — a sponsor seeing an irrelevant
 * section can skip it, but one who never sees bump-in has no way to tell us
 * when they're arriving, and we find out at the loading dock.
 */
export function logisticsVisibility(mappedTier: string | undefined): LogisticsVisibility {
    const known = ['platinum', 'gold', 'room', 'coffeecart', 'digital', 'community', 'raffleonly']
    const tier = (mappedTier ?? '').toLowerCase()
    const isBooth = BOOTH_TIERS.includes(tier as (typeof BOOTH_TIERS)[number]) || !known.includes(tier)

    return {
        exhibition: isBooth,
        screens: isBooth,
        induction: isBooth,
        raffle: true,
        socialQuote: true,
    }
}

const optionalText = (max: number) =>
    z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        z.string().trim().max(max).optional(),
    )

const optionalEmail = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.email({ error: 'Enter a valid email address' }).max(320).optional(),
)

/**
 * Every field is optional. The committee chases missing logistics through the
 * Jira status fields, and a sponsor filling in half the form now and the rest
 * next week is the normal case — a required field would just block the save
 * and lose what they'd already typed.
 */
export const logisticsSchema = z.object({
    // Exhibition
    exhibitorContactName: optionalText(200),
    exhibitorContactPhone: optionalText(50),
    exhibitorContactEmail: optionalEmail,
    bumpInSlot: optionalText(200),
    bumpOutWindow: optionalText(200),
    bumpInAttendees: optionalText(2000),
    loadingDockAttendees: optionalText(2000),
    equipmentList: optionalText(2000),
    nonLaptopElectrical: optionalText(2000),
    trolleyOrForklift: optionalText(500),
    loadingDockAssistance: optionalText(500),
    porterAssistance: optionalText(500),
    parking: optionalText(200),
    // Screens
    screenOrders: optionalText(500),
    screenNotes: optionalText(1000),
    screenInvoicingEmail: optionalEmail,
    // Raffle
    rafflePrize: optionalText(1000),
    raffleLocation: optionalText(200),
    // Social
    socialQuote: optionalText(2000),
})

export type LogisticsFields = z.infer<typeof logisticsSchema>

/** Field keys, so storage and write-back iterate one list rather than two. */
export const LOGISTICS_KEYS = Object.keys(logisticsSchema.shape) as Array<keyof LogisticsFields>

/**
 * Drops answers for sections the sponsor can't see, so a tier change (or a
 * hand-crafted POST) can't write exhibition data against a Digital sponsor.
 */
export function filterByVisibility(fields: LogisticsFields, visibility: LogisticsVisibility): LogisticsFields {
    const exhibitionKeys: Array<keyof LogisticsFields> = [
        'exhibitorContactName',
        'exhibitorContactPhone',
        'exhibitorContactEmail',
        'bumpInSlot',
        'bumpOutWindow',
        'bumpInAttendees',
        'loadingDockAttendees',
        'equipmentList',
        'nonLaptopElectrical',
        'trolleyOrForklift',
        'loadingDockAssistance',
        'porterAssistance',
        'parking',
    ]
    const screenKeys: Array<keyof LogisticsFields> = ['screenOrders', 'screenNotes', 'screenInvoicingEmail']
    const raffleKeys: Array<keyof LogisticsFields> = ['rafflePrize', 'raffleLocation']

    const result: LogisticsFields = { ...fields }
    const clear = (keys: Array<keyof LogisticsFields>) => {
        for (const key of keys) result[key] = undefined
    }

    if (!visibility.exhibition) clear(exhibitionKeys)
    if (!visibility.screens) clear(screenKeys)
    if (!visibility.raffle) clear(raffleKeys)
    if (!visibility.socialQuote) result.socialQuote = undefined

    return result
}
