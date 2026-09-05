import type { ExhibitorLogistics } from '../sponsors/jira-client.server'
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
     * Advances the Jira assets status field for a completed
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

    /**
     * Committee-owned logistics (bump-in/out, equipment, parking) keyed by
     * issue key, for the venue's exhibitor spreadsheet. Read live from Jira
     * rather than D1 — none of it is synced, and the spreadsheet goes to the
     * venue, so it should reflect the committee's latest edits.
     *
     * Throws if Jira is unreachable: unlike the write-backs, a silent partial
     * result here would be handed to the venue as if it were complete.
     */
    getExhibitorLogistics(): Promise<Map<string, ExhibitorLogistics>>

    /**
     * Pushes the sponsor's logistics answers into Jira. Sponsor-owned, so the
     * portal's values win. Best-effort like the other pushes — never blocks
     * the sponsor's save.
     */
    pushLogistics(issueKey: string, logistics: Record<string, string>): Promise<void>
}
