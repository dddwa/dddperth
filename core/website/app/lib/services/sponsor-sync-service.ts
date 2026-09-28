import type { AssetTracking, ExhibitorLogistics, SponsorDeliverables } from '../sponsors/jira-client.server'
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
     * Writes the sponsor's submitted blurb, website and socials into Jira.
     *
     * **Throws on failure**, so the route can abandon the save before touching
     * D1 — a sponsor must never see a success banner over an answer Jira
     * refused. Takes the details explicitly rather than re-reading the profile:
     * the write happens *before* D1 is updated, so a stored copy would be the
     * previous save's values.
     */
    pushSponsorDetails(
        issueKey: string,
        details: Pick<SponsorProfile, 'blurb' | 'websiteUrl' | 'socials'>,
    ): Promise<void>

    /**
     * Re-attaches a logo replaced *after* the completion write-back already
     * fired, with a comment so the change shows in the activity feed. A logo
     * uploaded before completion is skipped — the completion write-back
     * attaches it. Best-effort: never throws, since the file is already safe
     * in R2 and the sponsor's upload has genuinely succeeded.
     */
    attachUpdatedLogo(issueKey: string): Promise<void>

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

    /**
     * Re-runs the workstream status flips after a sync.
     *
     * Status flips are best-effort on save, so Jira being down loses them
     * permanently without this. Profile and logistics *fields* are deliberately
     * not replayed — Jira is canonical at sync time, and re-pushing a stored
     * answer would overwrite a committee edit the sync just pulled in.
     */
    retryPendingStatusFlips(): Promise<void>

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
     * Assets owed and the committee's asset status per issue key, read live
     * from Jira for the admin follow-up list. Returns null when Jira isn't
     * configured or is unreachable: the rest of that list comes from D1, so
     * it renders with the assets column marked unknown rather than failing.
     */
    getAssetTracking(): Promise<Map<string, AssetTracking> | null>

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
