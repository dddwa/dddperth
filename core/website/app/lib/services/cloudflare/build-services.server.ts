import type { CloudflareEnv } from '../../../remix-app-load-context'
import type { AppConfig } from '../app-config'
import type { AppServices } from '../app-services'
import { createConsoleEmailService } from '../console-email-service.server'
import { createCookieSessionStorages } from './cookie-session-storages.server'
import { createD1AnnouncementsStore } from './d1-announcements-store.server'
import { createD1AuthService } from './d1-auth-service.server'
import { createD1NotificationLog } from './d1-notification-log.server'
import { createD1SponsorsStore } from './d1-sponsors-store.server'
import { createD1VotingStore } from './d1-voting-store.server'
import { createJiraSponsorSyncService } from './jira-sponsor-sync.server'
import { createMdxContentService } from './mdx-content-service.server'
import { createR2AssetStorage } from './r2-asset-storage.server'
import { createResendEmailService } from './resend-email-service.server'
import { createTitoTicketsService } from './tito-tickets-service.server'

/**
 * Wires the Cloudflare-backed implementations of every AppService. This is
 * the only place the platform-specific bindings (D1 and R2 in particular)
 * are connected. A fork ports to a new platform by writing a sibling file.
 */
export function buildCloudflareServices(config: AppConfig, env: CloudflareEnv): AppServices {
    const db = env.DB

    // Console fallback for local development when no Resend key is set —
    // magic-link emails get printed to the dev-server output instead.
    const email = config.auth.resendApiKey
        ? createResendEmailService({ apiKey: config.auth.resendApiKey, defaultFrom: config.auth.emailFrom })
        : createConsoleEmailService()

    const sponsors = createD1SponsorsStore(db)
    const notifications = createD1NotificationLog(db)
    const assets = createR2AssetStorage(env.SPONSOR_ASSETS)

    return {
        voting: createD1VotingStore(db),
        announcements: createD1AnnouncementsStore(db),
        content: createMdxContentService(),
        tickets: createTitoTicketsService(config),
        auth: createD1AuthService({ config, db, email, sponsors }),
        email,
        sessions: createCookieSessionStorages(config),
        sponsors,
        assets,
        sponsorSync: createJiraSponsorSyncService({ config, sponsors, assets, email, notifications }),
        notifications,
    }
}
