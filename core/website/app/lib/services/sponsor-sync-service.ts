import type { ExhibitorLogistics, SponsorDeliverables } from '../sponsors/jira-client.server'
import type { SponsorProfile, SponsorSyncRun } from './sponsors-store'

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
     * portal's value overrides whatever Jira has. Detail failures throw so
     * the form can fail before updating D1.
     */
    pushSponsorOwnedData(
        issueKey: string,
        change: 'details' | 'logo',
        details?: Pick<SponsorProfile, 'blurb' | 'websiteUrl' | 'socials'>,
    ): Promise<void>

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

    /** Retries completion statuses after a sync. Profile/logistics fields
     * are not replayed: the latest Jira values are canonical. */
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
     * portal's values win. Failures throw so the form can fail before
     * updating D1.
     *
     * `submittedKeys` names the portal fields the sponsor actually submitted.
     * A field they never answered is left untouched in Jira — the committee
     * gathers most of this by email, and a blanket write would erase it. A
     * field submitted empty *is* cleared, because that's a deliberate removal.
     */
    pushLogistics(
        issueKey: string,
        logistics: Record<string, string>,
        submittedKeys: ReadonlySet<string>,
    ): Promise<void>
}
