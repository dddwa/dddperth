import type { AnnouncementsStore } from './announcements-store'
import type { AssetStorage } from './asset-storage'
import type { AuthService } from './auth-service'
import type { ContentService } from './content-service'
import type { EmailService } from './email-service'
import type { NotificationLog } from './notification-log'
import type { SessionStorages } from './session-storages'
import type { SponsorSyncService } from './sponsor-sync-service'
import type { SponsorsStore } from './sponsors-store'
import type { TicketsService } from './tickets-service'
import type { VotingStore } from './voting-store'

/**
 * The full set of platform-agnostic services available to loaders/actions.
 *
 * Routes consume `context.services.<x>` rather than `context.cloudflare.env`
 * or `context.db`. A fork ports the app to a new platform by writing a new
 * builder that returns this shape.
 */
export interface AppServices {
    voting: VotingStore
    announcements: AnnouncementsStore
    content: ContentService
    tickets: TicketsService
    auth: AuthService
    email: EmailService
    sessions: SessionStorages
    sponsors: SponsorsStore
    assets: AssetStorage
    sponsorSync: SponsorSyncService
    notifications: NotificationLog
}
