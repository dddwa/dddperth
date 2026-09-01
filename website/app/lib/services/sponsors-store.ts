/**
 * Sponsor portal storage. Sponsor records and contact emails are synced from
 * the conference's Jira sponsors project; profiles hold what the sponsor
 * submits through the portal. See `sponsorPortal` on the conference manifest.
 */

export interface SponsorRecord {
    issueKey: string
    year: string
    companyName: string
    /** Raw Jira tier value (e.g. "Gold"). Mapped for display via manifest tierMap. */
    tier: string
    /** Website prefill from Jira, if the committee captured one. */
    website?: string
    jiraStatus?: string
    active: boolean
    assetsTaskFlippedAt?: number
    assetsTaskPending: boolean
}

export interface SponsorLogoMeta {
    r2Key: string
    filename: string
    contentType: string
    size: number
    uploadedAt: number
}

export interface SponsorProfile {
    issueKey: string
    blurb?: string
    websiteUrl?: string
    /** Platform → URL, e.g. { twitter: "https://…", linkedin: "https://…" }. */
    socials: Record<string, string>
    logo?: SponsorLogoMeta
    /** First time the completion criteria were met; never unset. */
    completedAt?: number
    updatedAt?: number
    updatedBy?: string
}

/** Result of diffing Jira issues against current D1 state. Computed by the
 * pure `computeSyncPlan()` in lib/sponsors/sync-plan.ts. */
export interface SponsorSyncPlan {
    upserts: Array<{
        issueKey: string
        year: string
        companyName: string
        tier: string
        website?: string
        jiraStatus?: string
    }>
    deactivateIssueKeys: string[]
    contactAdds: Array<{ email: string; issueKey: string }>
    contactRemoves: Array<{ email: string; issueKey: string }>
}

export interface SponsorSyncRun {
    id: number
    trigger: 'cron' | 'manual'
    startedAt: number
    finishedAt?: number
    status: 'running' | 'ok' | 'error'
    sponsorsUpserted?: number
    sponsorsDeactivated?: number
    contactsAdded?: number
    contactsRemoved?: number
    error?: string
}

export interface SponsorListEntry extends SponsorRecord {
    contacts: string[]
    profile: SponsorProfile | null
}

export interface SponsorsStore {
    /** True when the email belongs to at least one active sponsor. Feeds the
     * magic-link "may log in" check alongside the admin allowlist. */
    isSponsorContact(email: string): Promise<boolean>

    /** The active sponsor workspace for a contact email. If an email somehow
     * maps to several active sponsors, the lowest issue key wins (Phase 1
     * has no workspace switcher). */
    getSponsorForEmail(email: string): Promise<SponsorRecord | null>

    getSponsor(issueKey: string): Promise<SponsorRecord | null>
    getContactEmails(issueKey: string): Promise<string[]>
    getProfile(issueKey: string): Promise<SponsorProfile | null>

    /** Admin view: every sponsor for the year (active and departed), with
     * contacts and profile attached. */
    listSponsors(year: string): Promise<SponsorListEntry[]>

    /** Sync inputs: every sponsor/contact row regardless of year, so the
     * planner can deactivate anything that left the sync query. */
    getAllSponsorsForSync(): Promise<Array<{ issueKey: string; active: boolean }>>
    getAllContacts(): Promise<Array<{ email: string; issueKey: string }>>

    saveDetails(
        issueKey: string,
        details: { blurb: string; websiteUrl: string; socials: Record<string, string> },
        updatedBy: string,
    ): Promise<void>
    saveLogo(issueKey: string, logo: Omit<SponsorLogoMeta, 'uploadedAt'>, updatedBy: string): Promise<void>

    /** Stamps completed_at if not already set. Returns true when this call
     * did the stamping (i.e. the profile just became complete). */
    markProfileCompleted(issueKey: string): Promise<boolean>

    applySyncPlan(plan: SponsorSyncPlan): Promise<{
        sponsorsUpserted: number
        sponsorsDeactivated: number
        contactsAdded: number
        contactsRemoved: number
    }>

    startSyncRun(trigger: 'cron' | 'manual'): Promise<number>
    finishSyncRun(
        id: number,
        result: Pick<
            SponsorSyncRun,
            'status' | 'sponsorsUpserted' | 'sponsorsDeactivated' | 'contactsAdded' | 'contactsRemoved' | 'error'
        >,
    ): Promise<void>
    getLatestSyncRun(): Promise<SponsorSyncRun | null>

    /** Issue keys owing a Jira "Assets for Conference" flip. */
    getPendingWritebacks(): Promise<string[]>
    markAssetsTaskPending(issueKey: string): Promise<void>
    markAssetsTaskFlipped(issueKey: string): Promise<void>
}
