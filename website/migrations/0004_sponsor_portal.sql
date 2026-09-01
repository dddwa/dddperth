-- Sponsor portal
--
-- Four tables:
--   sponsors           — synced from the Jira sponsors project, keyed by issue key
--   sponsor_contacts   — emails allowed into a sponsor's portal workspace (synced)
--   sponsor_profiles   — what the sponsor submits (blurb, links, logo metadata)
--   sponsor_sync_runs  — bookkeeping for cron/manual Jira syncs
--
-- Sponsors soft-delete (active = 0) when they drop out of the sync query so
-- their profile and uploaded assets are never orphaned; contacts hard-delete
-- because they carry no owned data and removal must revoke access.

CREATE TABLE IF NOT EXISTS sponsors (
    issue_key TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    company_name TEXT NOT NULL,
    tier TEXT NOT NULL,
    website TEXT,
    jira_status TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    -- Jira "Assets for Conference" checkbox write-back state. flipped_at is
    -- set once the checkbox is confirmed in Jira; pending means the flip is
    -- owed and the next sync retries it.
    assets_task_flipped_at INTEGER,
    assets_task_pending INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sponsors_active_year ON sponsors(active, year);

CREATE TABLE IF NOT EXISTS sponsor_contacts (
    email TEXT NOT NULL,
    issue_key TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (email, issue_key)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_issue ON sponsor_contacts(issue_key);

CREATE TABLE IF NOT EXISTS sponsor_profiles (
    issue_key TEXT PRIMARY KEY,
    blurb TEXT,
    website_url TEXT,
    socials_json TEXT,
    logo_r2_key TEXT,
    logo_filename TEXT,
    logo_content_type TEXT,
    logo_size INTEGER,
    logo_uploaded_at INTEGER,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sponsor_sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_source TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL,
    sponsors_upserted INTEGER,
    sponsors_deactivated INTEGER,
    contacts_added INTEGER,
    contacts_removed INTEGER,
    error TEXT
);
