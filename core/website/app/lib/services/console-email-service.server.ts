import type { EmailMessage, EmailService } from './email-service'

/**
 * Dev fallback. Prints the email to the server console so the magic-link
 * flow still works when no real provider is configured. The text body is
 * shown (not the HTML) because magic-link URLs land in plain text — that's
 * what a developer needs to copy.
 */
export function createConsoleEmailService(): EmailService {
    return {
        canSend() {
            return false
        },

        async send(message: EmailMessage) {
            console.log('\n=== Email (no provider configured) ===')
            console.log(`To:      ${message.to}`)
            console.log(`Subject: ${message.subject}`)
            console.log('---')
            console.log(message.text)
            if (message.attachments?.length) {
                console.log('---')
                console.log(`Attachments: ${message.attachments.map((a) => a.filename).join(', ')}`)
            }
            console.log('=======================================\n')
        },
    }
}
