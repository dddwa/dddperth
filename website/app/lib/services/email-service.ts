/**
 * Transactional email surface. Magic links go through this today; future
 * use cases (speaker calendar invites, ticket confirmations, etc.) should
 * use the same service so a fork swaps providers in one place.
 *
 * Implementations live alongside their platform code — see the
 * Cloudflare-specific `createResendEmailService` and the platform-agnostic
 * `createConsoleEmailService` (used as a dev fallback when no API key is
 * configured).
 */
export interface EmailService {
    /** False ⇒ send() will fall back to logging instead of actually delivering. */
    canSend(): boolean

    send(args: EmailMessage): Promise<void>
}

export interface EmailMessage {
    to: string
    subject: string
    html: string
    text: string
    /** Per-message override of the configured from-address (rare; keep undefined for normal use). */
    from?: string
    /**
     * Attachments are part of the surface so future calendar-invite and
     * ticket-confirmation flows don't require an interface change.
     */
    attachments?: Array<{
        filename: string
        /** Base64 string or raw text; provider implementations decide based on contentType. */
        content: string
        contentType: string
    }>
}
