/**
 * Blob storage for sponsor-uploaded assets (logos). Backed by R2 on
 * Cloudflare; keys are opaque to callers beyond the conventions in the
 * sponsor portal routes (`sponsors/{year}/{issueKey}/…`).
 */

export interface StoredAsset {
    body: ReadableStream
    contentType: string
    size: number
}

export interface AssetStorage {
    put(key: string, body: ArrayBuffer, options: { contentType: string }): Promise<void>
    get(key: string): Promise<StoredAsset | null>
    delete(key: string): Promise<void>
}
