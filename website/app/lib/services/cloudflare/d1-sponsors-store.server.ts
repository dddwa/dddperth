import type {
    SponsorListEntry,
    SponsorProfile,
    SponsorRecord,
    SponsorsStore,
    SponsorSyncRun,
} from '../sponsors-store'

interface SponsorRow {
    issue_key: string
    year: string
    company_name: string
    tier: string
    website: string | null
    jira_status: string | null
    active: number
    assets_task_flipped_at: number | null
    assets_task_pending: number
}

interface SponsorProfileRow {
    issue_key: string
    blurb: string | null
    website_url: string | null
    socials_json: string | null
    logo_r2_key: string | null
    logo_filename: string | null
    logo_content_type: string | null
    logo_size: number | null
    logo_uploaded_at: number | null
    completed_at: number | null
    updated_at: number
    updated_by: string
}

interface SyncRunRow {
    id: number
    trigger_source: string
    started_at: number
    finished_at: number | null
    status: string
    sponsors_upserted: number | null
    sponsors_deactivated: number | null
    contacts_added: number | null
    contacts_removed: number | null
    error: string | null
}

function toSponsor(row: SponsorRow): SponsorRecord {
    return {
        issueKey: row.issue_key,
        year: row.year,
        companyName: row.company_name,
        tier: row.tier,
        website: row.website ?? undefined,
        jiraStatus: row.jira_status ?? undefined,
        active: row.active === 1,
        assetsTaskFlippedAt: row.assets_task_flipped_at ?? undefined,
        assetsTaskPending: row.assets_task_pending === 1,
    }
}

function toProfile(row: SponsorProfileRow): SponsorProfile {
    let socials: Record<string, string> = {}
    if (row.socials_json) {
        try {
            socials = JSON.parse(row.socials_json) as Record<string, string>
        } catch {
            // Corrupt JSON shouldn't take the profile page down.
        }
    }
    return {
        issueKey: row.issue_key,
        blurb: row.blurb ?? undefined,
        websiteUrl: row.website_url ?? undefined,
        socials,
        logo:
            row.logo_r2_key && row.logo_content_type
                ? {
                      r2Key: row.logo_r2_key,
                      filename: row.logo_filename ?? 'logo',
                      contentType: row.logo_content_type,
                      size: row.logo_size ?? 0,
                      uploadedAt: row.logo_uploaded_at ?? 0,
                  }
                : undefined,
        completedAt: row.completed_at ?? undefined,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
    }
}

function toSyncRun(row: SyncRunRow): SponsorSyncRun {
    return {
        id: row.id,
        trigger: row.trigger_source === 'cron' ? 'cron' : 'manual',
        startedAt: row.started_at,
        finishedAt: row.finished_at ?? undefined,
        status: row.status as SponsorSyncRun['status'],
        sponsorsUpserted: row.sponsors_upserted ?? undefined,
        sponsorsDeactivated: row.sponsors_deactivated ?? undefined,
        contactsAdded: row.contacts_added ?? undefined,
        contactsRemoved: row.contacts_removed ?? undefined,
        error: row.error ?? undefined,
    }
}

export function createD1SponsorsStore(db: D1Database): SponsorsStore {
    return {
        async isSponsorContact(email) {
            const row = await db
                .prepare(
                    `SELECT 1 FROM sponsor_contacts c
                     JOIN sponsors s ON s.issue_key = c.issue_key AND s.active = 1
                     WHERE c.email = ? LIMIT 1`,
                )
                .bind(email.toLowerCase())
                .first()
            return row !== null
        },

        async getSponsorForEmail(email) {
            const row = await db
                .prepare(
                    `SELECT s.* FROM sponsors s
                     JOIN sponsor_contacts c ON c.issue_key = s.issue_key
                     WHERE c.email = ? AND s.active = 1
                     ORDER BY s.issue_key ASC LIMIT 1`,
                )
                .bind(email.toLowerCase())
                .first<SponsorRow>()
            return row ? toSponsor(row) : null
        },

        async getSponsor(issueKey) {
            const row = await db.prepare(`SELECT * FROM sponsors WHERE issue_key = ?`).bind(issueKey).first<SponsorRow>()
            return row ? toSponsor(row) : null
        },

        async getContactEmails(issueKey) {
            const result = await db
                .prepare(`SELECT email FROM sponsor_contacts WHERE issue_key = ? ORDER BY email`)
                .bind(issueKey)
                .all<{ email: string }>()
            return (result.results ?? []).map((r) => r.email)
        },

        async getProfile(issueKey) {
            const row = await db
                .prepare(`SELECT * FROM sponsor_profiles WHERE issue_key = ?`)
                .bind(issueKey)
                .first<SponsorProfileRow>()
            return row ? toProfile(row) : null
        },

        async listSponsors(year) {
            const [sponsors, contacts, profiles] = await Promise.all([
                db.prepare(`SELECT * FROM sponsors WHERE year = ? ORDER BY company_name`).bind(year).all<SponsorRow>(),
                db
                    .prepare(
                        `SELECT c.email, c.issue_key FROM sponsor_contacts c
                         JOIN sponsors s ON s.issue_key = c.issue_key WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<{ email: string; issue_key: string }>(),
                db
                    .prepare(
                        `SELECT p.* FROM sponsor_profiles p
                         JOIN sponsors s ON s.issue_key = p.issue_key WHERE s.year = ?`,
                    )
                    .bind(year)
                    .all<SponsorProfileRow>(),
            ])

            const contactsByIssue = new Map<string, string[]>()
            for (const c of contacts.results ?? []) {
                const list = contactsByIssue.get(c.issue_key) ?? []
                list.push(c.email)
                contactsByIssue.set(c.issue_key, list)
            }
            const profileByIssue = new Map((profiles.results ?? []).map((p) => [p.issue_key, toProfile(p)]))

            return (sponsors.results ?? []).map(
                (row): SponsorListEntry => ({
                    ...toSponsor(row),
                    contacts: contactsByIssue.get(row.issue_key) ?? [],
                    profile: profileByIssue.get(row.issue_key) ?? null,
                }),
            )
        },

        async getAllSponsorsForSync() {
            const result = await db.prepare(`SELECT issue_key, active FROM sponsors`).all<{
                issue_key: string
                active: number
            }>()
            return (result.results ?? []).map((r) => ({ issueKey: r.issue_key, active: r.active === 1 }))
        },

        async getAllContacts() {
            const result = await db.prepare(`SELECT email, issue_key FROM sponsor_contacts`).all<{
                email: string
                issue_key: string
            }>()
            return (result.results ?? []).map((r) => ({ email: r.email, issueKey: r.issue_key }))
        },

        async saveDetails(issueKey, details, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO sponsor_profiles (issue_key, blurb, website_url, socials_json, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, unixepoch(), ?)
                     ON CONFLICT(issue_key) DO UPDATE SET
                         blurb = excluded.blurb,
                         website_url = excluded.website_url,
                         socials_json = excluded.socials_json,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(issueKey, details.blurb, details.websiteUrl, JSON.stringify(details.socials), updatedBy)
                .run()
        },

        async saveLogo(issueKey, logo, updatedBy) {
            await db
                .prepare(
                    `INSERT INTO sponsor_profiles
                         (issue_key, logo_r2_key, logo_filename, logo_content_type, logo_size, logo_uploaded_at, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, unixepoch(), unixepoch(), ?)
                     ON CONFLICT(issue_key) DO UPDATE SET
                         logo_r2_key = excluded.logo_r2_key,
                         logo_filename = excluded.logo_filename,
                         logo_content_type = excluded.logo_content_type,
                         logo_size = excluded.logo_size,
                         logo_uploaded_at = excluded.logo_uploaded_at,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(issueKey, logo.r2Key, logo.filename, logo.contentType, logo.size, updatedBy)
                .run()
        },

        async markProfileCompleted(issueKey) {
            const result = await db
                .prepare(
                    `UPDATE sponsor_profiles SET completed_at = unixepoch()
                     WHERE issue_key = ? AND completed_at IS NULL`,
                )
                .bind(issueKey)
                .run()
            return (result.meta.changes ?? 0) > 0
        },

        async applySyncPlan(plan) {
            const statements: D1PreparedStatement[] = []

            for (const s of plan.upserts) {
                statements.push(
                    db
                        .prepare(
                            `INSERT INTO sponsors
                                 (issue_key, year, company_name, tier, website, jira_status, active, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, ?, 1, unixepoch(), unixepoch())
                             ON CONFLICT(issue_key) DO UPDATE SET
                                 year = excluded.year,
                                 company_name = excluded.company_name,
                                 tier = excluded.tier,
                                 website = excluded.website,
                                 jira_status = excluded.jira_status,
                                 active = 1,
                                 updated_at = excluded.updated_at`,
                        )
                        .bind(s.issueKey, s.year, s.companyName, s.tier, s.website ?? null, s.jiraStatus ?? null),
                )
            }
            for (const issueKey of plan.deactivateIssueKeys) {
                statements.push(
                    db
                        .prepare(`UPDATE sponsors SET active = 0, updated_at = unixepoch() WHERE issue_key = ?`)
                        .bind(issueKey),
                )
            }
            for (const c of plan.contactAdds) {
                statements.push(
                    db
                        .prepare(
                            `INSERT OR IGNORE INTO sponsor_contacts (email, issue_key, created_at)
                             VALUES (?, ?, unixepoch())`,
                        )
                        .bind(c.email.toLowerCase(), c.issueKey),
                )
            }
            for (const c of plan.contactRemoves) {
                statements.push(
                    db
                        .prepare(`DELETE FROM sponsor_contacts WHERE email = ? AND issue_key = ?`)
                        .bind(c.email.toLowerCase(), c.issueKey),
                )
            }

            if (statements.length > 0) {
                await db.batch(statements)
            }

            return {
                sponsorsUpserted: plan.upserts.length,
                sponsorsDeactivated: plan.deactivateIssueKeys.length,
                contactsAdded: plan.contactAdds.length,
                contactsRemoved: plan.contactRemoves.length,
            }
        },

        async startSyncRun(trigger) {
            const row = await db
                .prepare(
                    `INSERT INTO sponsor_sync_runs (trigger_source, started_at, status)
                     VALUES (?, unixepoch(), 'running') RETURNING id`,
                )
                .bind(trigger)
                .first<{ id: number }>()
            if (!row) throw new Error('Failed to record sponsor sync run')
            return row.id
        },

        async finishSyncRun(id, result) {
            await db
                .prepare(
                    `UPDATE sponsor_sync_runs SET
                         finished_at = unixepoch(),
                         status = ?,
                         sponsors_upserted = ?,
                         sponsors_deactivated = ?,
                         contacts_added = ?,
                         contacts_removed = ?,
                         error = ?
                     WHERE id = ?`,
                )
                .bind(
                    result.status,
                    result.sponsorsUpserted ?? null,
                    result.sponsorsDeactivated ?? null,
                    result.contactsAdded ?? null,
                    result.contactsRemoved ?? null,
                    result.error ?? null,
                    id,
                )
                .run()
        },

        async getLatestSyncRun() {
            const row = await db
                .prepare(`SELECT * FROM sponsor_sync_runs ORDER BY id DESC LIMIT 1`)
                .first<SyncRunRow>()
            return row ? toSyncRun(row) : null
        },

        async getPendingWritebacks() {
            const result = await db
                .prepare(`SELECT issue_key FROM sponsors WHERE assets_task_pending = 1 AND active = 1`)
                .all<{ issue_key: string }>()
            return (result.results ?? []).map((r) => r.issue_key)
        },

        async markAssetsTaskPending(issueKey) {
            await db
                .prepare(`UPDATE sponsors SET assets_task_pending = 1, updated_at = unixepoch() WHERE issue_key = ?`)
                .bind(issueKey)
                .run()
        },

        async markAssetsTaskFlipped(issueKey) {
            await db
                .prepare(
                    `UPDATE sponsors SET assets_task_pending = 0, assets_task_flipped_at = unixepoch(),
                         updated_at = unixepoch()
                     WHERE issue_key = ?`,
                )
                .bind(issueKey)
                .run()
        },
    }
}
