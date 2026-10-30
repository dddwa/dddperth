import { z } from 'zod'

/**
 * Not a setting an admin types in: the "Refresh from Jira" button on the run
 * sheets writes a new `cacheGeneration`, and the run sheet cache keys include
 * it, so every cached Jira response goes stale at once. That covers every
 * filter, both run sheet pages and every Cloudflare location. The Cache API
 * can't list or bulk-delete its entries, so changing the key is the only way
 * to invalidate them all.
 */
export const runsheetSettingsSchema = z.object({
    cacheGeneration: z.string(),
})
