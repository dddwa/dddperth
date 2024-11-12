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
})

// Define TypeScript type based on Zod schema
export type TitoPayload = z.infer<typeof TitoPayloadSchema>
