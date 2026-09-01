import type { AssetStorage } from '../asset-storage'

/**
 * R2-backed asset storage over the optional SPONSOR_ASSETS binding. The
 * binding is absent for forks without a sponsor portal — the portal routes
 * 404 before ever touching this, so the unavailable stub only fires on
 * misconfiguration (portal configured but bucket binding missing).
 */
export function createR2AssetStorage(bucket: R2Bucket | undefined): AssetStorage {
    if (!bucket) {
        const unavailable = () => {
            throw new Error(
                'SPONSOR_ASSETS R2 binding is not configured — add an r2_buckets entry to the wrangler config',
            )
        }
        return { put: unavailable, get: unavailable, delete: unavailable }
    }

    return {
        async put(key, body, options) {
            await bucket.put(key, body, { httpMetadata: { contentType: options.contentType } })
        },

        async get(key) {
            const object = await bucket.get(key)
            if (!object) return null
            return {
                body: object.body,
                contentType: object.httpMetadata?.contentType ?? 'application/octet-stream',
                size: object.size,
            }
        },

        async delete(key) {
            await bucket.delete(key)
        },
    }
}
