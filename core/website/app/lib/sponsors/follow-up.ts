import type { SponsorListEntry } from '../services/sponsors-store'
import type { AssetTracking } from './jira-client.server'
import type { LogisticsVisibility } from './logistics'
import {
    effectiveAnswers,
    splitJiraOptions,
    sponsorProgress,
    stripTierSuffix,
    type SectionKey,
    type SectionProgress,
} from './progress'

/**
 * The admin follow-up list: per sponsor, what they've supplied and what the
 * sponsorship team still needs to chase, plus a ready-to-edit email.
 *
 * Built on `sponsorProgress` so the admin view can never disagree with the
 * checklist the sponsor sees on their own dashboard. Pure — unit tested in
 * follow-up.test.ts.
 */

export interface FollowUpRow {
    issueKey: string
    companyName: string
    tier: string
    contacts: string[]
    /** Latest sponsor save (details, logistics or logo). Undefined means they
     * have never saved anything in the portal. Deliberately not the profile's
     * `updatedAt`, which every Jira sync bumps. */
    lastPortalSave?: number
    sections: SectionProgress[]
    /** Labels of missing items in required sections. */
    requiredOutstanding: string[]
    /** Optional sections not yet answered — asked about, not chased. */
    optionalOutstanding: string[]
    /** The answers the sponsorship team asks about most, as the sponsor
     * currently sees them (their own, or the committee's Jira prefill). */
    answers: {
        bumpInSlot?: string
        bumpOutWindow?: string
        screenOrders?: string
        rafflePrize?: string
    }
    /** Whether this sponsor's tier gets a booth (bump-in, screens). */
    hasBooth: boolean
    assets: AssetSummary
}

/**
 * What we know about assets that arrive outside the portal (videos, print
 * artwork). The portal can't see the upload folder, so this is only ever the
 * committee's own Jira status — shown verbatim rather than interpreted,
 * because the status labels belong to each conference's Jira.
 */
export type AssetSummary =
    | { known: false }
    | {
          known: true
          /** Assets owed, tier suffixes stripped. */
          required: string[]
          videoRequired: boolean
          status?: string
      }

const filled = (value: string | undefined): value is string => typeof value === 'string' && value.trim() !== ''

export function buildFollowUpRow(args: {
    sponsor: SponsorListEntry
    visibility: LogisticsVisibility
    meetTheExpertsResponded: boolean
    meetTheExpertsOffered: boolean
    /** Null when Jira couldn't be read; undefined when this sponsor had no entry. */
    assets: AssetTracking | undefined | null
}): FollowUpRow {
    const { sponsor, visibility, assets } = args
    const { profile } = sponsor

    const sections = sponsorProgress({
        profile,
        sponsor,
        visibility,
        meetTheExpertsResponded: args.meetTheExpertsResponded,
        meetTheExpertsOffered: args.meetTheExpertsOffered,
    })
    const logistics = effectiveAnswers(profile, sponsor).logistics

    const saves = [profile?.detailsUpdatedAt, profile?.logisticsUpdatedAt, profile?.logo?.uploadedAt].filter(
        (value): value is number => value !== undefined,
    )

    const required = splitJiraOptions(assets?.assetsRequired).map(stripTierSuffix)

    return {
        issueKey: sponsor.issueKey,
        companyName: sponsor.companyName,
        tier: sponsor.tier,
        contacts: sponsor.contacts,
        lastPortalSave: saves.length > 0 ? Math.max(...saves) : undefined,
        sections,
        requiredOutstanding: sections.filter((s) => !s.optional).flatMap((s) => s.missing),
        optionalOutstanding: sections.filter((s) => s.optional).flatMap((s) => s.missing),
        answers: {
            bumpInSlot: filled(logistics.bumpInSlot) ? logistics.bumpInSlot : undefined,
            bumpOutWindow: filled(logistics.bumpOutWindow) ? logistics.bumpOutWindow : undefined,
            screenOrders: filled(logistics.screenOrders) ? logistics.screenOrders : undefined,
            rafflePrize: filled(logistics.rafflePrize) ? logistics.rafflePrize : undefined,
        },
        hasBooth: visibility.exhibition,
        assets:
            assets === null
                ? { known: false }
                : {
                      known: true,
                      required,
                      videoRequired: required.some((asset) => /video/i.test(asset)),
                      status: assets?.assetsStatus,
                  },
    }
}

/** Most to chase first, then anyone who has never opened the portal, then by name. */
export function sortForFollowUp(rows: FollowUpRow[]): FollowUpRow[] {
    return [...rows].sort(
        (a, b) =>
            b.requiredOutstanding.length - a.requiredOutstanding.length ||
            Number(a.lastPortalSave !== undefined) - Number(b.lastPortalSave !== undefined) ||
            b.optionalOutstanding.length - a.optionalOutstanding.length ||
            a.companyName.localeCompare(b.companyName),
    )
}

export function needsFollowUp(row: FollowUpRow): boolean {
    return row.requiredOutstanding.length > 0 || row.optionalOutstanding.length > 0
}

/**
 * Builds a `mailto:` URL. Addresses stay readable (`@` unescaped) because
 * some clients show the raw address field; everything else is percent-encoded,
 * with CRLF line breaks as RFC 6068 asks for.
 */
export function mailtoUrl(args: { to?: string[]; bcc?: string[]; subject: string; body: string }): string {
    const address = (list: string[]) => list.map((email) => encodeURIComponent(email).replaceAll('%40', '@')).join(',')
    const params = [
        ...(args.bcc && args.bcc.length > 0 ? [`bcc=${address(args.bcc)}`] : []),
        `subject=${encodeURIComponent(args.subject)}`,
        `body=${encodeURIComponent(args.body.replaceAll('\r\n', '\n').replaceAll('\n', '\r\n'))}`,
    ]
    return `mailto:${address(args.to ?? [])}?${params.join('&')}`
}

/** Optional items read better as questions — "no screen needed" is a fine answer. */
const OPTIONAL_PROMPTS: Partial<Record<string, string>> = {
    'TV screen order': "TV screens — let us know if you'd like one (or that you don't need one)",
    'Raffle prize': "Raffle prize — if you're donating one, what it is",
    'Quote for social media': 'A short quote for our social media posts',
    'Meet the Experts response': 'Meet the Experts — whether anyone from your team would like a slot',
}

export interface EmailContext {
    conferenceName: string
    portalUrl: string
    /** Signs the email; omitted when the admin has no name on file. */
    senderName?: string
}

/**
 * A starting point for a follow-up email to one sponsor. Meant to be edited
 * before sending, so it lists what's missing plainly rather than trying to
 * sound final. Null when there's nothing to ask for.
 */
export function followUpEmail(row: FollowUpRow, context: EmailContext): string | null {
    if (!needsFollowUp(row) || row.contacts.length === 0) return null

    const lines: string[] = [
        `Hi ${row.companyName} team,`,
        '',
        `Thanks again for sponsoring ${context.conferenceName}! We're pulling everything together for the day and wanted to check in on a few details.`,
    ]

    if (row.requiredOutstanding.length > 0) {
        lines.push('', 'We still need:', ...row.requiredOutstanding.map((item) => `- ${item}`))
    }

    if (row.optionalOutstanding.length > 0) {
        lines.push(
            '',
            row.requiredOutstanding.length > 0 ? 'And if they apply to you:' : "We haven't heard from you on:",
            ...row.optionalOutstanding.map((item) => `- ${OPTIONAL_PROMPTS[item] ?? item}`),
        )
    }

    lines.push(
        '',
        `You can fill all of this in on the sponsor portal: ${context.portalUrl}`,
        'Sign in with this email address and it will take you straight to your checklist.',
        '',
        'Thanks,',
        context.senderName ?? '',
    )

    return mailtoUrl({
        to: row.contacts,
        subject: `${context.conferenceName} sponsorship: a few details still needed`,
        body: lines.join('\n').trimEnd(),
    })
}

/**
 * One email to every sponsor missing a given section, contacts in BCC so
 * sponsors don't see each other. For chasing a single topic ("bump-in times
 * are due Friday") across everyone at once.
 */
export function sectionChaseEmail(
    rows: FollowUpRow[],
    sectionKey: SectionKey,
    context: EmailContext,
): { url: string; sponsorCount: number; label: string } | null {
    const outstanding = rows.filter((row) => row.sections.some((s) => s.key === sectionKey && !s.complete))
    const bcc = [...new Set(outstanding.flatMap((row) => row.contacts))]
    const label = outstanding[0]?.sections.find((s) => s.key === sectionKey)?.label
    if (bcc.length === 0 || !label) return null

    const body = [
        'Hi all,',
        '',
        `Thanks again for sponsoring ${context.conferenceName}! We're still missing your ${label.toLowerCase()} details.`,
        '',
        `You can add them on the sponsor portal: ${context.portalUrl}`,
        'Sign in with this email address and it will take you straight to your checklist.',
        '',
        'Thanks,',
        context.senderName ?? '',
    ]
        .join('\n')
        .trimEnd()

    return {
        url: mailtoUrl({ bcc, subject: `${context.conferenceName} sponsorship: ${label}`, body }),
        sponsorCount: outstanding.length,
        label,
    }
}
