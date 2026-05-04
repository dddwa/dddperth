import type { AnnouncementsStore } from './announcements-store'
import type { AuthService } from './auth-service'
import type { ContentService } from './content-service'
import type { SessionStorages } from './session-storages'
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
    sessions: SessionStorages
}
