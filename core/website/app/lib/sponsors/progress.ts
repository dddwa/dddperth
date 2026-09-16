import type { SponsorProfile, SponsorRecord } from '../services/sponsors-store'
import { prefilledLogistics, type LogisticsVisibility } from './logistics'
import { isProfileComplete, prefilledProfileFields } from './profile'

/**
 * What the sponsor still owes us, per section. One source of truth for both
 * the dashboard's progress summary and the Jira status write-backs, so a
 * section can't read "done" on the dashboard while its Jira status stays
 * pending. Pure — unit tested in progress.test.ts.
 */

export type SectionKey = 'profile' | 'exhibition' | 'screens' | 'raffle' | 'social' | 'meetTheExperts'

export interface SectionProgress {
    key: SectionKey
    label: string
    /** Where the sponsor goes to work on it. */
    href: string
    done: number
    total: number
    /** True once every item in the section is supplied. */
    complete: boolean
    /**
     * Nothing filled in at all. Distinguished from "partly done" so the
     * dashboard can say "not started" rather than showing an empty bar.
     */
    notStarted: boolean
    /** Section is optional — an incomplete one doesn't block "all done". */
    optional: boolean
}

const filled = (value: string | undefined): boolean => typeof value === 'string' && value.trim() !== ''

/** What the sponsor record contributes: the committee's Jira answers. */
export type SponsorJiraPrefills = Pick<SponsorRecord, 'website' | 'jiraQuote' | 'jiraSocials' | 'jiraLogistics'> | null

/**
 * What the sponsor would see on the forms right now — their own answers where
 * they've submitted, the committee's Jira values where they haven't.
 *
 * Progress has to be measured against this rather than against the stored
 * profile alone, or the dashboard contradicts the form sitting next to it:
 * iCetana's website, social quote and screen order were all in Jira and all
 * rendered in the form, while the checklist read "0 of 3" and "Not started".
 * Worse than cosmetic — `statusFlipReadiness` shares this view, so a social
 * quote the committee collected in August never advanced the social status
 * off "Quotes and Logos Pending (Sponsor)".
 *
 * Authority stays per-form and asymmetric, which is why this defers to the
 * two existing prefill functions instead of merging here: profile fields flip
 * on `detailsUpdatedAt`, logistics wholesale on `logisticsUpdatedAt`. Merging
 * in one step would let an hour-old Jira snapshot resurrect a field the
 * sponsor had just cleared.
 */
function effectiveAnswers(profile: SponsorProfile | null, sponsor: SponsorJiraPrefills) {
    const details = prefilledProfileFields({
        profile,
        jira: { quote: sponsor?.jiraQuote, website: sponsor?.website, socials: sponsor?.jiraSocials },
    })
    return {
        blurb: details.blurb,
        websiteUrl: details.websiteUrl,
        logistics: prefilledLogistics({ profile, jiraLogistics: sponsor?.jiraLogistics }),
    }
}

/**
 * The exhibition answers we consider "required" for the status flip.
 *
 * Deliberately narrower than the whole form: the venue needs a contact, a
 * bump-in/out time and an equipment list. Everything else (trolley, porter,
 * parking, notes) is genuinely optional, and treating a blank "do you need a
 * forklift?" as outstanding would leave most sponsors permanently incomplete.
 */
const REQUIRED_EXHIBITION_KEYS = [
    'exhibitorContactName',
    'exhibitorContactPhone',
    'exhibitorContactEmail',
    'bumpInSlot',
    'bumpOutWindow',
    'equipmentList',
] as const

export interface ProgressInput {
    profile: SponsorProfile | null
    /**
     * The sponsor record, for the committee's Jira answers. Optional so a
     * caller with only a profile still type-checks, but omitting it counts
     * the sponsor's own submissions only — pass it wherever a sponsor sees
     * the result.
     */
    sponsor?: SponsorJiraPrefills
    visibility: LogisticsVisibility
    /** Whether the sponsor has answered the Meet the Experts invitation
     * (either picking slots or declining). */
    meetTheExpertsResponded: boolean
    /** False when the conference has no Meet the Experts slots configured. */
    meetTheExpertsOffered: boolean
}

/**
 * Per-section progress, in the order the dashboard lists them. Sections the
 * sponsor's tier doesn't get (no booth → no exhibition/screens) are omitted
 * entirely rather than shown as incomplete forever.
 */
export function sponsorProgress(input: ProgressInput): SectionProgress[] {
    const { profile, sponsor = null, visibility, meetTheExpertsResponded, meetTheExpertsOffered } = input
    const answers = effectiveAnswers(profile, sponsor)
    const logistics = answers.logistics
    const sections: SectionProgress[] = []

    const push = (
        key: SectionKey,
        label: string,
        href: string,
        flags: boolean[],
        options: { optional?: boolean } = {},
    ) => {
        const done = flags.filter(Boolean).length
        sections.push({
            key,
            label,
            href,
            done,
            total: flags.length,
            complete: done === flags.length,
            notStarted: done === 0,
            optional: options.optional ?? false,
        })
    }

    push('profile', 'Company profile', '/portal/profile', [
        Boolean(profile?.logo),
        filled(answers.blurb),
        filled(answers.websiteUrl),
    ])

    if (visibility.exhibition) {
        push(
            'exhibition',
            'Exhibition & bump-in',
            '/portal/logistics',
            REQUIRED_EXHIBITION_KEYS.map((key) => filled(logistics[key])),
        )
    }

    // Screens are opt-in and invoiced by the venue, so "no screens" is a
    // valid finished answer. We can't tell "decided against screens" from
    // "hasn't looked yet", so this never blocks completion.
    if (visibility.screens) {
        push('screens', 'TV screen orders', '/portal/logistics', [filled(logistics.screenOrders)], {
            optional: true,
        })
    }

    if (visibility.raffle) {
        push('raffle', 'Raffle prize', '/portal/logistics', [filled(logistics.rafflePrize)], { optional: true })
    }

    if (visibility.socialQuote) {
        push('social', 'Quote for social media', '/portal/logistics', [filled(logistics.socialQuote)], {
            optional: true,
        })
    }

    if (meetTheExpertsOffered) {
        push('meetTheExperts', 'Meet the Experts', '/portal', [meetTheExpertsResponded], { optional: true })
    }

    return sections
}

/**
 * True only when every *required* section is complete.
 *
 * This is what the dashboard's "all done" banner keys off. Vicki's note: the
 * old banner said "All done — thank you!" as soon as the website profile was
 * complete, while logistics were still untouched, so sponsors stopped there.
 */
export function allRequiredComplete(sections: SectionProgress[]): boolean {
    return sections.every((section) => section.optional || section.complete)
}

/** The first section with outstanding items — what the portal points the
 * sponsor at next after a save. */
export function nextIncompleteSection(sections: SectionProgress[]): SectionProgress | undefined {
    return sections.find((section) => !section.complete && !section.optional)
}

/**
 * Whether each Jira workstream status may be advanced. Mirrors the sections
 * above, but keyed to the Jira fields rather than the dashboard.
 *
 * The induction flip is a tri-state: the sponsor's answer decides whether an
 * induction is needed at all, and until they've filled in the surrounding
 * exhibition details we can't tell "nobody needs dock access" from "hasn't
 * got there yet".
 */
export interface StatusFlipReadiness {
    social: boolean
    exhibition: boolean
    raffle: boolean
    induction: 'required' | 'not-required' | undefined
}

export function statusFlipReadiness(args: {
    profile: SponsorProfile | null
    /** The committee's Jira answers — see `effectiveAnswers`. Without this a
     * quote or bump-in time the committee collected by email never advances
     * its workstream, because the sponsor never retyped it. */
    sponsor?: SponsorJiraPrefills
    visibility: LogisticsVisibility
}): StatusFlipReadiness {
    const { profile, sponsor = null, visibility } = args
    const logistics = effectiveAnswers(profile, sponsor).logistics

    const exhibitionComplete =
        visibility.exhibition && REQUIRED_EXHIBITION_KEYS.every((key) => filled(logistics[key]))

    return {
        // The media team needs a logo and words before they can build a post.
        // The website blurb alone isn't enough — the social quote is a
        // separate, deliberately different piece of copy.
        social: Boolean(profile?.logo) && filled(logistics.socialQuote),
        exhibition: exhibitionComplete,
        raffle: filled(logistics.rafflePrize),
        induction: !visibility.induction
            ? undefined
            : filled(logistics.loadingDockAttendees)
              ? 'required'
              : exhibitionComplete
                ? 'not-required'
                : undefined,
    }
}

/**
 * Splits Jira's comma-joined multi-checkbox text back into its ticked
 * options.
 *
 * A naive `split(',')` is wrong here: every option label in "Assets Required"
 * carries its own parenthesised tier list, so "Video for Mega Screen
 * (Platinum, Gold)" would break in half. Only commas *outside* parentheses
 * separate options.
 */
export function splitJiraOptions(value: string | undefined): string[] {
    if (!value) return []

    const parts: string[] = []
    let current = ''
    let depth = 0

    for (const char of value) {
        if (char === '(') depth++
        else if (char === ')') depth = Math.max(0, depth - 1)

        if (char === ',' && depth === 0) {
            parts.push(current)
            current = ''
            continue
        }
        current += char
    }
    parts.push(current)

    return parts.map((part) => part.trim()).filter(Boolean)
}

/**
 * Drops the parenthesised tier list Jira option labels carry, e.g.
 * "Logo for screens (Platinum, Gold, Room, Coffee, Digital)" → "Logo for
 * screens".
 *
 * That suffix exists so the committee can tick the right boxes in Jira. To a
 * sponsor it's a puzzle: a Platinum sponsor sees "(Platinum, Gold, Room,
 * Coffee, Digital)" on a row that already applies to them, and has to work
 * out which of the five words is theirs. The ticks are already per-sponsor,
 * so the tier list tells them nothing they need.
 *
 * Only a *trailing* group is removed, so parentheses inside a label survive.
 */
export function stripTierSuffix(label: string): string {
    return label.replace(/\s*\([^()]*\)\s*$/, '').trim() || label.trim()
}

/** Re-exported so callers doing "is the website profile done?" don't need
 * both modules. */
export { isProfileComplete }
