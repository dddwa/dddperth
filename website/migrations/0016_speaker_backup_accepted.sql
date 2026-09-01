-- Speaker portal: backup speaker acceptance is a session-level self-report
--
-- A waitlisted (backup) session has no "confirm in Sessionize" step, so
-- speakers instead self-report accepting the backup slot from the
-- checklist. Session-level and shared by every presenter — same idiom as
-- session_details — so a dual-speaker session only needs one presenter to
-- accept it, not each of them individually.

CREATE TABLE session_backup_acceptance (
    sessionize_session_id TEXT PRIMARY KEY,
    accepted_at INTEGER NOT NULL,
    accepted_by TEXT NOT NULL
);
