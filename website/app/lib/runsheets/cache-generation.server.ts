import type { AppServices } from '../services/app-services'

/** Before any refresh has happened. */
const INITIAL_GENERATION = '0'

export interface RunsheetCacheState {
    generation: string
    /** When an admin last refreshed, or null if nobody has. */
    refreshedAt: string | null
}

export async function getRunsheetCacheState(services: AppServices): Promise<RunsheetCacheState> {
    const entry = await services.adminSettings.get('runsheets')
    return {
        generation: entry?.value.cacheGeneration ?? INITIAL_GENERATION,
        refreshedAt: entry?.updatedAt ?? null,
    }
}

/**
 * Marks every cached run sheet response stale. Nothing is fetched here: the
 * next visitor to each page and filter reads Jira again.
 */
export async function invalidateRunsheetCache(services: AppServices, adminEmail: string): Promise<void> {
    await services.adminSettings.set('runsheets', { cacheGeneration: crypto.randomUUID() }, adminEmail)
}
