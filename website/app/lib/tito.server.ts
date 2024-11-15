import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { TITO_SECURITY_TOKEN } from './config.server'

export function verifySignature(rawBody: string, signature: string): boolean {
    if (!TITO_SECURITY_TOKEN) {
        return false
    }

    const hmac = createHmac('sha256', TITO_SECURITY_TOKEN)
    hmac.update(rawBody)
    const digest = hmac.digest('base64')

    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
}

// Define Zod schema for the Tito payload
export const TitoPayloadSchema = z.object({
    slug: z.string(),
    release_slug: z.string(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    email: z.string().email().nullable(),
    responses: z.object({
        'what-is-your-pronoun': z.string().optional(),
        'what-industry-are-you-in': z.string().optional(),
        'we-may-send-you-emails-about-this-year-s': z.string().optional(),
        'indicate-your-level-of-comfort-being-pho': z.string().optional(),
        'how-do-you-describe-your-skill-level': z.string().optional(),
        'how-do-you-describe-your-job-role': z.string().optional(),
        'do-you-agree-to-abide-by-the-code-of-con': z.string().optional(),
        'ddd-perth-remains-low-cost-due-to-our-ge': z.string().optional(),
        'please-indicate-lunch-preference': z.string().optional(),
    }),
    upgrade_ids: z.array(z.string()).optional(),
})

// Define TypeScript type based on Zod schema
export type TitoPayload = z.infer<typeof TitoPayloadSchema>
