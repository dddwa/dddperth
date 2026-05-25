import type { SessionStorage } from 'react-router'
import type { AdminDateTimeSessionData, AuthSessionData, VotingStorageData } from '../session-types'

/**
 * Cookie-backed session storages. Built once per request from the configured
 * session secret. Keeping them on the load context (rather than module-level
 * singletons) means the secret flows through `AppConfig` cleanly and a fork
 * can swap to a different storage backend without forking session.server.ts.
 */
export interface SessionStorages {
    auth: SessionStorage<AuthSessionData>
    voting: SessionStorage<VotingStorageData>
    adminDateTime: SessionStorage<AdminDateTimeSessionData>
}
