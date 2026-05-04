import type { AppConfig } from '../app-config'
import type { AppServices } from '../app-services'
import { createCookieSessionStorages } from './cookie-session-storages.server'
import { createD1AnnouncementsStore } from './d1-announcements-store.server'
import { createD1VotingStore } from './d1-voting-store.server'
import { createGitHubAuthService } from './github-auth-service.server'
import { createMdxContentService } from './mdx-content-service.server'
import { createTitoTicketsService } from './tito-tickets-service.server'

/**
 * Wires the Cloudflare-backed implementations of every AppService. This is
 * the only place the platform-specific bindings (D1 in particular) are
 * connected. A fork ports to a new platform by writing a sibling file.
 */
export function buildCloudflareServices(config: AppConfig, db: D1Database): AppServices {
    return {
        voting: createD1VotingStore(db),
        announcements: createD1AnnouncementsStore(db),
        content: createMdxContentService(config),
        tickets: createTitoTicketsService(config),
        auth: createGitHubAuthService(config),
        sessions: createCookieSessionStorages(config),
    }
}
