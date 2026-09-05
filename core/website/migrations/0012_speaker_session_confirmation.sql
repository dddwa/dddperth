-- Speaker portal: session confirmation status
--
-- Sessionize exposes an "isConfirmed" (Owner Confirmed) flag per session via
-- its public API, synced in alongside the rest of the session's details.
-- Also add a self-reported companion field, same "I've done it" idiom as
-- ticket_claimed_at, for a speaker who's confirmed in Sessionize before the
-- next sync has caught up.

ALTER TABLE speaker_sessions ADD COLUMN is_confirmed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE speaker_profiles ADD COLUMN session_confirmed_reported_at INTEGER;
