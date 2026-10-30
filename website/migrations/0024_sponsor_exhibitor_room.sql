-- The room a room sponsor's package covers, synced from Jira so the admin
-- sponsor list (and the run sheets built from it) can show assignments without
-- a per-sponsor Jira round-trip. Committee-owned: the portal only displays it.
ALTER TABLE sponsors ADD COLUMN exhibitor_room TEXT;
