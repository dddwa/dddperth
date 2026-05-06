import { Resend } from 'resend'
import type { EmailMessage, EmailService } from '../email-service'

/**
 * Resend-backed email service. Cloudflare-specific only because that's
 * where it's wired in — Resend itself works from any Node/Workers runtime
 * with an API key.
 */
export function createResendEmailService(args: { apiKey: string; defaultFrom: string }): EmailService {
    const resend = new Resend(args.apiKey)

    return {
        canSend() {
            return true
        },

        async send(message: EmailMessage) {
            // Resend's SDK does NOT throw on API-level rejections (unverified
            // domain, bad recipient, suppressed address, etc.). Instead it
            // resolves with `{ data: null, error: {...} }`. Inspect the
            // response and throw so the auth layer's try/catch surfaces a
            // `login.email_failed` event with the real reason.
            const result = await resend.emails.send({
                from: message.from ?? args.defaultFrom,
                to: message.to,
                subject: message.subject,
                html: message.html,
                text: message.text,
                attachments: message.attachments?.map((a) => ({
                    filename: a.filename,
                    content: a.content,
                    contentType: a.contentType,
                })),
            })

            if (result.error) {
                throw new Error(`Resend rejected send: ${result.error.name}: ${result.error.message}`)
            }
        },
    }
}
