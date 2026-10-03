import { z } from 'zod'
import { isValidEmail } from '~/lib/auth/validation'
import type { ConferenceFeedbackInput, TalkFeedbackInput } from '~/lib/services/feedback-store'

/**
 * Spam defences, in the absence of a captcha. Neither stops a determined
 * person; both stop the drive-by form-filling bots that find any public form.
 *
 * - **Honeypot**: a text field hidden from people (off-screen, `aria-hidden`,
 *   not tabbable). Bots fill every field they see; a person never sees it.
 * - **Minimum fill time**: the form carries the time it was rendered, and a
 *   submission faster than a person could plausibly pick a rating is dropped.
 *
 * A tripped check *pretends to succeed*: telling a bot it was caught only
 * teaches it what to change.
 */
export const HONEYPOT_FIELD = 'website'
export const STARTED_AT_FIELD = 'startedAt'
export const MIN_FILL_MS = 3000

export function looksLikeSpam(formData: FormData, now: number): boolean {
    const honeypot = formData.get(HONEYPOT_FIELD)
    if (typeof honeypot === 'string' && honeypot.trim() !== '') return true

    const startedAt = Number(formData.get(STARTED_AT_FIELD))
    if (!Number.isFinite(startedAt) || startedAt <= 0) return true
    return now - startedAt < MIN_FILL_MS
}

const MAX_TEXT = 5000

const optionalText = z
    .string()
    .optional()
    .transform((value) => value?.trim() || null)
    .refine((value) => value === null || value.length <= MAX_TEXT, `Please keep this under ${MAX_TEXT} characters.`)

const optionalEmail = z
    .string()
    .optional()
    .transform((value) => value?.trim().toLowerCase() || null)
    .refine((value) => value === null || isValidEmail(value), 'Please enter a valid email address, or leave it blank.')

const rating = z
    .string({ error: 'Please choose a rating from 1 to 5.' })
    .regex(/^[1-5]$/, 'Please choose a rating from 1 to 5.')
    .transform(Number)

export const conferenceFeedbackSchema = z.object({
    rating,
    bestThing: optionalText,
    ideas: optionalText,
    meetTheExperts: optionalText,
    feedback: optionalText,
    email: optionalEmail,
}) satisfies z.ZodType<ConferenceFeedbackInput, unknown>

export const talkFeedbackSchema = z.object({
    targetId: z.string({ error: 'Please choose a talk.' }).min(1, 'Please choose a talk.'),
    rating,
    speakerFeedback: optionalText,
    organiserFeedback: optionalText,
    email: optionalEmail,
}) satisfies z.ZodType<TalkFeedbackInput, unknown>
