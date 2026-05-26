import { createHmac, timingSafeEqual } from 'node:crypto'
import type { AppConfig } from '../app-config'
import type { TicketsService } from '../tickets-service'

export function createTitoTicketsService(config: AppConfig): TicketsService {
    return {
        verifyWebhookSignature(rawBody, signature) {
            const token = config.tito.securityToken
            if (!token) {
                return false
            }

            const hmac = createHmac('sha256', token)
            hmac.update(rawBody)
            const digest = hmac.digest('base64')

            return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
        },
    }
}
