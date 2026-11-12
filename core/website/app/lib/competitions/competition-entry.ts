import type { CompetitionConfig } from '@ddd/conference-config'
import { z } from 'zod'
import { isValidEmail } from '~/lib/auth/validation'

export { openWindowStatus as competitionStatus, type OpenWindowStatus as CompetitionStatus } from '~/lib/forms/open-window'

export function findCompetition(
    competitions: readonly CompetitionConfig[] | undefined,
    slug: string | undefined,
): CompetitionConfig | undefined {
    if (!slug) return undefined
    return competitions?.find((competition) => competition.slug === slug)
}

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com'])

/**
 * The address used to decide whether someone has already entered. The
 * cheapest way to enter a competition twice is a variant of the same inbox,
 * so this collapses the common ones: a `+tag` is dropped for every provider
 * (almost all of them deliver `jo+anything@` to `jo@`), and for Gmail the dots
 * are dropped too and `googlemail.com` folds into `gmail.com`, since Gmail
 * ignores both.
 *
 * Only used for matching. The address as typed is what's stored to contact
 * the winner.
 */
export function emailKey(email: string): string {
    const normalised = email.trim().toLowerCase()
    const at = normalised.lastIndexOf('@')
    if (at < 0) return normalised
    let local = normalised.slice(0, at)
    let domain = normalised.slice(at + 1)
    const plus = local.indexOf('+')
    if (plus > 0) local = local.slice(0, plus)
    if (GMAIL_DOMAINS.has(domain)) {
        local = local.replaceAll('.', '')
        domain = 'gmail.com'
    }
    return `${local}@${domain}`
}

export const MAX_NAME = 200
export const MAX_ANSWER = 2000

export const TERMS_FIELD = 'acceptTerms'
export const TERMS_ACCEPTED = 'yes'

export const competitionEntrySchema = z.object({
    name: z
        .string({ error: 'Please enter your name.' })
        .transform((value) => value.trim())
        .pipe(
            z
                .string()
                .min(1, 'Please enter your name.')
                .max(MAX_NAME, `Please keep your name under ${MAX_NAME} characters.`),
        ),
    email: z
        .string({ error: 'Please enter your email address.' })
        .transform((value) => value.trim().toLowerCase())
        .pipe(
            z
                .string()
                .min(1, 'Please enter your email address.')
                .refine(isValidEmail, 'Please enter a valid email address.'),
        ),
    answer: z
        .string({ error: 'Please answer the question.' })
        .transform((value) => value.trim())
        .pipe(
            z
                .string()
                .min(1, 'Please answer the question.')
                .max(MAX_ANSWER, `Please keep your answer under ${MAX_ANSWER} characters.`),
        ),
    [TERMS_FIELD]: z.literal(TERMS_ACCEPTED, { error: 'Please accept the terms and conditions to enter.' }),
})
