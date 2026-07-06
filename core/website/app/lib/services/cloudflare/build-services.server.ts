import type { AppConfig } from '../app-config'
import type { AppServices } from '../app-services'
import { createConsoleEmailService } from '../console-email-service.server'
import { createCookieSessionStorages } from './cookie-session-storages.server'
import { createD1AnnouncementsStore } from './d1-announcements-store.server'
import { createD1AuthService } from './d1-auth-service.server'
import { createD1VotingStore } from './d1-voting-store.server'
import { createMdxContentService } from './mdx-content-service.server'
import { createResendEmailService } from './resend-email-service.server'
import { createTitoTicketsService } from './tito-tickets-service.server'

/**
 * Wires the Cloudflare-backed implementations of every AppService. This is
 * the only place the platform-specific bindings (D1 in particular) are
 * connected. A fork ports to a new platform by writing a sibling file.
 */
export function buildCloudflareServices(config: AppConfig, db: D1Database): AppServices {
    // Console fallback for local development when no Resend key is set —
    // magic-link emails get printed to the dev-server output instead.
    const email = config.auth.resendApiKey
        ? createResendEmailService({ apiKey: config.auth.resendApiKey, defaultFrom: config.auth.emailFrom })
        : createConsoleEmailService()

    return {
        voting: createD1VotingStore(db),
        announcements: createD1AnnouncementsStore(db),
        content: createMdxContentService(),
        tickets: createTitoTicketsService(config),
        auth: createD1AuthService({ config, db, email }),
        email,
        sessions: createCookieSessionStorages(config),
    }
}
