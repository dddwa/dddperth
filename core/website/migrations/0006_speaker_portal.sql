-- Speaker portal
--
-- Five tables:
--   speakers          — synced from Sessionize (accepted/waitlisted sessions),
--                        cross-referenced against Jira speaker issues for
--                        their Jira issue key
--   speaker_contacts  — emails allowed into a speaker's portal access,
--                        synced from their Jira issue (same shape as
--                        sponsor_contacts)
--   speaker_sessions  — one row per (speaker, session); a session with
--                        co-presenters produces multiple rows sharing a
--                        sessionize_session_id, which is how the portal
--                        finds co-presenters to share edit access with
--   speaker_profiles  — what the speaker (or a co-presenter) submits
--                        through the portal; not sourced from Sessionize
--   speaker_sync_runs — bookkeeping for cron/manual syncs
--
-- Speakers soft-delete (active = 0) when they drop out of the accepted/
-- waitlisted set so their profile is never orphaned; contacts hard-delete
-- because they carry no owned data and removal must revoke access.

CREATE TABLE IF NOT EXISTS speakers (
    sessionize_id TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    full_name TEXT NOT NULL,
    tag_line TEXT,
    bio TEXT,
    profile_picture_url TEXT,
    -- Set once a Jira speaker issue is found with a matching sessionize id
    -- custom field; null until that issue exists and syncs.
    jira_issue_key TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_speakers_active_year ON speakers(active, year);

CREATE TABLE IF NOT EXISTS speaker_contacts (
    email TEXT NOT NULL,
    sessionize_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY (email, sessionize_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_contacts_speaker ON speaker_contacts(sessionize_id);

CREATE TABLE IF NOT EXISTS speaker_sessions (
    sessionize_speaker_id TEXT NOT NULL,
    sessionize_session_id TEXT NOT NULL,
    session_title TEXT NOT NULL,
    -- Null for waitlisted speakers with no fixed agenda slot yet.
    starts_at TEXT,
    ends_at TEXT,
    room_name TEXT,
    -- Raw Sessionize status (Accepted/Waitlisted/etc), shown as a badge.
    status TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (sessionize_speaker_id, sessionize_session_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_sessions_speaker ON speaker_sessions(sessionize_speaker_id);
CREATE INDEX IF NOT EXISTS idx_speaker_sessions_session ON speaker_sessions(sessionize_session_id);

CREATE TABLE IF NOT EXISTS speaker_profiles (
    sessionize_id TEXT PRIMARY KEY,
    dietary_requirements TEXT,
    av_requirements TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    accessibility_notes TEXT,
    -- Forward-compat bucket for fields added later without a migration.
    extra_json TEXT,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    -- Email of whoever submitted it — may be a co-presenter, not the subject.
    updated_by TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS speaker_sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trigger_source TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    finished_at INTEGER,
    status TEXT NOT NULL,
    speakers_upserted INTEGER,
    speakers_deactivated INTEGER,
    contacts_added INTEGER,
    contacts_removed INTEGER,
    error TEXT
);
