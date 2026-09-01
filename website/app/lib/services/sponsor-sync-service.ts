import type { SponsorSyncRun } from './sponsors-store'

export type SyncOutcome =
    | { ok: true; run: SponsorSyncRun }
    | { ok: false; reason: 'not-configured' | 'already-running' | 'error'; error?: string }

/**
 * Keeps portal sponsor/contact data in step with the conference's Jira
 * project, and pushes completion state back. Runs from the hourly cron
 * (production) and the admin "Sync now" button.
 */
export interface SponsorSyncService {
    /** True when the manifest has sponsorPortal AND Jira credentials exist
     * (or the stub is active). When false, sync/write-back are no-ops. */
    isConfigured(): boolean

    /** Pulls sponsor issues from Jira and reconciles D1. Never throws —
     * failures land in the returned outcome and the sync-run row. */
    syncNow(trigger: 'cron' | 'manual'): Promise<SyncOutcome>

    /**
     * Ticks the Jira "Assets for Conference" checkbox for a completed
     * profile. Read-then-write and idempotent. Failures mark the sponsor
     * pending so the next sync retries; never throws.
     */
    flipAssetsTask(issueKey: string): Promise<void>

    /**
     * Pushes sponsor-owned data (quote, website, socials — and for logo
     * changes after completion, a fresh attachment) into Jira. Called on
     * every portal save: these fields belong to the sponsor, so the
     * portal's value overrides whatever Jira has. Best-effort; never
     * throws and never blocks the sponsor's save.
     */
    pushSponsorOwnedData(issueKey: string, change: 'details' | 'logo'): Promise<void>

    /** Retries every owed write-back (sponsors with assets_task_pending). */
    retryPendingWritebacks(): Promise<void>
}
