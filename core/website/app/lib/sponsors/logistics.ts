import { z } from 'zod'

/**
 * Sponsor-supplied logistics: exhibition/bump-in, raffle, screens, induction.
 * Sponsor-owned, so the portal's values are pushed to Jira on every save.
 * Pure — no platform imports.
 */

/** Tiers with an exhibition space. Community is in: those sponsorships are
 * often in-kind and still bump equipment in. Mapped tierMap keys, not raw
 * Jira values. */
export const BOOTH_TIERS = ['platinum', 'gold', 'room', 'community'] as const

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

/** An unknown tier sees the exhibition sections — better to show a sponsor a
 * section they can skip than to hide bump-in from someone who needs it. */
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

/** Must match the Jira option values exactly — pushLogistics drops anything
 * that doesn't match, so drift here silently stops saving to Jira. */
export const BUMP_IN_SLOTS = [
    'Friday noon - 1pm',
    'Friday 1pm - 2pm',
    'Friday 2pm - 3pm',
    'Friday 3pm - 4pm',
    'Friday 4pm - 5pm',
    'Friday 5pm - 6pm',
    'Saturday 6.30am to 7am (minimal set-up only)',
] as const

export const BUMP_OUT_WINDOWS = [
    'During afternoon tea (room sponsors only)',
    'Saturday 4pm',
    'Saturday 5pm (after conference concludes)',
] as const

export const PARKING_OPTIONS = ['For Bump In', 'For Bump Out'] as const

export const SCREEN_OPTIONS = [
    '55" LCD ($500+GST)',
    '65" LCD ($600+GST)',
    '75" LCD ($700+GST)',
    '85" LCD ($800+GST)',
] as const

export const RAFFLE_LOCATIONS = ['Exhibition Space', 'Raffle Give-away on main stage'] as const

/** Keeps stored values visible when Jira's option labels have changed since
 * the sponsor last saved. Without this, an unrelated form save silently
 * replaces an unknown select with blank and drops unknown checkbox values. */
export function optionsIncludingStored(options: readonly string[], storedValues: readonly string[]): string[] {
    const result = [...options]
    for (const stored of storedValues) {
        const value = stored.trim()
        if (value && !result.includes(value)) result.push(value)
    }
    return result
}

// Free text on save, so an old answer survives the committee editing options.
const optionalText = (max: number) =>
    z.preprocess(
        (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
        z.string().trim().max(max).optional(),
    )

const optionalEmail = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.email({ error: 'Enter a valid email address' }).max(320).optional(),
)

/** All optional — sponsors fill this in over several visits. */
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
    // Screens. "Screen ordering notes" (customfield_10163) is deliberately
    // absent: it's the committee's own running note ("informed PAV - 23/8"),
    // not something the sponsor supplies. Collecting it here would both show
    // sponsors internal shorthand and let a portal save overwrite it.
    screenOrders: optionalText(500),
    screenInvoicingEmail: optionalEmail,
    // Raffle
    rafflePrize: optionalText(1000),
    raffleLocation: optionalText(200),
    // Social
    socialQuote: optionalText(2000),
    // Spreadsheet-only: no Jira field, so it stays in D1 for the export.
    additionalNotes: optionalText(2000),
})

export type LogisticsFields = z.infer<typeof logisticsSchema>

/** Field keys, so storage and write-back iterate one list. */
export const LOGISTICS_KEYS = Object.keys(logisticsSchema.shape) as Array<keyof LogisticsFields>

/**
 * What the logistics form starts out showing.
 *
 * The sponsorship team gathers bump-in times, screen orders and raffle prizes
 * by email long before a sponsor opens the portal, and files them on the Jira
 * issue. Until this existed the form read only the sponsor's own answers, so
 * they saw empty fields and their first save overwrote the lot.
 *
 * **Authority flips wholesale, not per field**, on the profile's
 * `logisticsUpdatedAt` — the same boundary `buildExhibitorSource` already uses
 * for the venue spreadsheet, deliberately reused so the form and the export
 * can't disagree about who owns an answer. Before the sponsor's first
 * submission Jira fills the gaps; after it their answers stand alone, so a
 * field they deliberately cleared can't be re-populated from a stale Jira
 * value on the next page load.
 */
export function prefilledLogistics(args: {
    /** The sponsor's own answers, and whether they have ever submitted. */
    profile: { logistics?: Record<string, string>; logisticsUpdatedAt?: number } | null
    /** Committee-entered values synced from Jira onto the sponsor record. */
    jiraLogistics: Record<string, string> | undefined
}): Record<string, string> {
    const { profile, jiraLogistics } = args
    const own = profile?.logistics ?? {}
    if (profile?.logisticsUpdatedAt !== undefined) return own
    return { ...(jiraLogistics ?? {}), ...own }
}

/**
 * The portal field names a sponsor with this visibility can actually see.
 *
 * Used to narrow the submitted-key set before it reaches Jira: a crafted POST
 * naming a hidden section's field must not clear that field in Jira any more
 * than it may write one.
 */
export function visibleLogisticsKeys(visibility: LogisticsVisibility): Set<string> {
    const probe: LogisticsFields = Object.fromEntries(LOGISTICS_KEYS.map((key) => [key, 'x']))
    const kept = filterByVisibility(probe, visibility)
    return new Set(LOGISTICS_KEYS.filter((key) => kept[key] !== undefined))
}

/** Drops answers for hidden sections, so a tier change or crafted POST can't
 * write exhibition data for a sponsor without a booth. */
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
        'additionalNotes',
    ]
    const screenKeys: Array<keyof LogisticsFields> = ['screenOrders', 'screenInvoicingEmail']
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
