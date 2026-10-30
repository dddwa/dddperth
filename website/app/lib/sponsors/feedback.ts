import { z } from 'zod'
import type { SponsorFeedbackInput } from '../services/sponsor-feedback-store'

/**
 * Pure rules for sponsor feedback: the portal form, and the admin's
 * "request feedback" emails. No platform imports — unit-testable in node.
 */

export const FEEDBACK_TEXT_MAX = 4000

const optionalText = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(FEEDBACK_TEXT_MAX, `Keep this under ${FEEDBACK_TEXT_MAX} characters`).optional(),
)

export const sponsorFeedbackSchema = z
    .object({
        rating: z.preprocess(
            (value) => (value === '' || value === undefined ? undefined : Number(value)),
            z.number().int().min(1, 'Choose a rating from 1 to 5').max(5, 'Choose a rating from 1 to 5').optional(),
        ),
        experience: optionalText,
        ideas: optionalText,
        testimonial: optionalText,
        testimonialAttribution: z.preprocess(
            (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
            z.string().trim().max(200, 'Keep this under 200 characters').optional(),
        ),
        portalFeedback: optionalText,
    })
    .superRefine((value, ctx) => {
        const answered = [value.rating, value.experience, value.ideas, value.testimonial, value.portalFeedback]
        if (answered.every((answer) => answer === undefined)) {
            ctx.addIssue({ code: 'custom', path: ['_form'], message: 'Answer at least one question before saving' })
        }
    })

export function toSponsorFeedbackInput(parsed: z.infer<typeof sponsorFeedbackSchema>): SponsorFeedbackInput {
    return {
        rating: parsed.rating ?? null,
        experience: parsed.experience ?? null,
        ideas: parsed.ideas ?? null,
        testimonial: parsed.testimonial ?? null,
        // Without a quote there is nothing to attribute.
        testimonialAttribution: parsed.testimonial ? (parsed.testimonialAttribution ?? null) : null,
        portalFeedback: parsed.portalFeedback ?? null,
    }
}

const emailSchema = z.email()

/**
 * Splits an admin-typed To: field into addresses. Commas, semicolons,
 * whitespace and newlines all separate, because addresses get pasted in from
 * Jira, Outlook and spreadsheets in every one of those shapes. Lowercased and
 * deduplicated so the same person isn't sent it twice.
 */
export function parseRecipients(raw: string): { emails: string[]; invalid: string[] } {
    const emails: string[] = []
    const invalid: string[] = []
    // Outlook pastes `Sam Smith <sam@acme.com>` or `"Smith, Sam" <sam@acme.com>`;
    // keep only the address. Quoted names go first since they can hold commas.
    const addressesOnly = raw.replace(/"[^"]*"/g, ' ').replace(/[^,;<>\n]*<([^>]+)>/g, ' $1 ')
    for (const token of addressesOnly.split(/[\s,;]+/)) {
        const address = token.trim().toLowerCase()
        if (!address) continue
        if (!emailSchema.safeParse(address).success) {
            if (!invalid.includes(address)) invalid.push(address)
        } else if (!emails.includes(address)) {
            emails.push(address)
        }
    }
    return { emails, invalid }
}

export interface FeedbackRequestSponsor {
    issueKey: string
    companyName: string
    contacts: string[]
}

export interface PlannedFeedbackRequest {
    issueKey: string
    companyName: string
    recipients: string[]
    /**
     * Recipients who aren't on the sponsor's portal contact list. They'll
     * receive the email but can't sign in to answer it until the committee
     * adds them to the sponsor in Jira.
     */
    notContacts: string[]
}

export interface FeedbackRequestPlan {
    requests: PlannedFeedbackRequest[]
    errors: Array<{ issueKey: string; companyName: string; message: string }>
}

/**
 * Turns the admin form (ticked sponsors + an editable To: field each) into
 * the emails to send. Any error blocks the whole send, so an admin never
 * sends half a batch and has to work out which half.
 */
export function planFeedbackRequests(args: {
    sponsors: FeedbackRequestSponsor[]
    selected: string[]
    recipientsByIssueKey: Record<string, string>
}): FeedbackRequestPlan {
    const plan: FeedbackRequestPlan = { requests: [], errors: [] }
    const byKey = new Map(args.sponsors.map((sponsor) => [sponsor.issueKey, sponsor]))

    for (const issueKey of new Set(args.selected)) {
        const sponsor = byKey.get(issueKey)
        if (!sponsor) {
            plan.errors.push({ issueKey, companyName: issueKey, message: 'Not an active sponsor this year' })
            continue
        }
        const { emails, invalid } = parseRecipients(args.recipientsByIssueKey[issueKey] ?? '')
        if (invalid.length > 0) {
            plan.errors.push({
                issueKey,
                companyName: sponsor.companyName,
                message: `Not a valid email address: ${invalid.join(', ')}`,
            })
            continue
        }
        if (emails.length === 0) {
            plan.errors.push({ issueKey, companyName: sponsor.companyName, message: 'Add at least one email address' })
            continue
        }
        const contacts = new Set(sponsor.contacts.map((email) => email.toLowerCase()))
        plan.requests.push({
            issueKey,
            companyName: sponsor.companyName,
            recipients: emails,
            notContacts: emails.filter((email) => !contacts.has(email)),
        })
    }

    return plan
}

export interface FeedbackRequestEmailVars {
    companyName: string
    conferenceName: string
    year: string
    /** Absolute URL of /sponsor-portal/feedback. */
    feedbackUrl: string
    /** The admin sending it, for the sign-off. */
    senderName?: string
}

export function feedbackRequestEmail(vars: FeedbackRequestEmailVars): { subject: string; text: string; html: string } {
    const conference = `${vars.conferenceName} ${vars.year}`
    const signOff = vars.senderName ? `${vars.senderName}\n${vars.conferenceName} team` : `${vars.conferenceName} team`

    const text = `Hi ${vars.companyName} team,

Thank you for sponsoring ${conference}. We'd love to hear how it went for you.

We're asking about three things:
- Your experience as a sponsor — what worked, and what didn't
- Ideas that would make sponsoring more valuable for you next time
- A short quote or testimonial we could share (only if you're happy for us to)

It only takes a few minutes. Sign in to the sponsor portal with this email address to leave your feedback:
${vars.feedbackUrl}

Once it's in, you can come back to edit it or add more at any time.

Thanks again,
${signOff}`

    const e = escapeHtml
    const html = `<p>Hi ${e(vars.companyName)} team,</p>
<p>Thank you for sponsoring ${e(conference)}. We'd love to hear how it went for you.</p>
<p>We're asking about three things:</p>
<ul>
<li>Your experience as a sponsor — what worked, and what didn't</li>
<li>Ideas that would make sponsoring more valuable for you next time</li>
<li>A short quote or testimonial we could share (only if you're happy for us to)</li>
</ul>
<p>It only takes a few minutes. <a href="${e(vars.feedbackUrl)}">Sign in to the sponsor portal</a> with this email address to leave your feedback.</p>
<p>Once it's in, you can come back to edit it or add more at any time.</p>
<p>Thanks again,<br/>${signOff.split('\n').map(e).join('<br/>')}</p>`

    return { subject: `How was sponsoring ${conference}?`, text, html }
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}
