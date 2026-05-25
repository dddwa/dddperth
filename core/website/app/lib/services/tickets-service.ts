/**
 * Ticketing webhooks (currently Tito). The verifier is a pure function over
 * (rawBody, signature) — the service binds the configured token internally
 * so callers can't accidentally pass the wrong one.
 */
export interface TicketsService {
    /**
     * Verifies a webhook signature. Returns false if no token is configured.
     */
    verifyWebhookSignature(rawBody: string, signature: string): boolean
}
