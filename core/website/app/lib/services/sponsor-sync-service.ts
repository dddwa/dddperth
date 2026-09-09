import type { ExhibitorLogistics, SponsorDeliverables } from '../sponsors/jira-client.server'
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

    /**
     * Advances the other workstream status fields (social, exhibition,
     * raffle, Optus induction) to match what the sponsor has now supplied.
     * Same ownership rule as the assets flip: only ever moves a status off a
     * "pending (sponsor)" value, so committee progress is never undone.
     *
     * Called after every profile and logistics save. Idempotent and
     * best-effort — never throws and never blocks the sponsor's save.
     */
    flipWorkstreamStatuses(issueKey: string): Promise<void>

    /**
     * Committee-owned deliverables for one sponsor (ticket allocation and
     * claim link, assets owed, upload folder), read live from Jira for the
     * portal dashboard. Returns an empty object when the portal isn't
     * configured or Jira is unreachable — these sections are informational,
     * so the dashboard hides them rather than failing to load.
     */
    getSponsorDeliverables(issueKey: string): Promise<SponsorDeliverables>

    /** Reconciles every sponsor-owned Jira field/status after a sync. This is
     * deliberately broader than the persisted assets pending flag: failed
     * best-effort saves otherwise have no request left to retry them. */
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
     * One sponsor's committee-entered logistics, for seeding blank fields on
     * their portal form. Returns `{}` when the portal isn't configured or Jira
     * is unreachable — seeding is a convenience, so the form still renders with
     * whatever the portal already holds.
     */
    getIssueLogistics(issueKey: string): Promise<ExhibitorLogistics>

    /**
     * Pushes the sponsor's logistics answers into Jira. Sponsor-owned, so the
     * portal's values win. Best-effort like the other pushes — never blocks
     * the sponsor's save.
     */
    pushLogistics(issueKey: string, logistics: Record<string, string>): Promise<void>
}
