-- Admin-editable settings, one row per section of /admin/settings.
--
-- Generic on purpose: each section (currently only `speakers`) stores its
-- values as one JSON document, validated by that section's Zod schema in
-- app/lib/admin-settings/. Adding a section means adding a schema and a page,
-- not a migration.
--
-- Not keyed by year. Only the current conference's values matter — last
-- year's training dates and dinner venue are never read again — so an admin
-- clears and re-enters a section each year rather than this table keeping
-- history.

CREATE TABLE IF NOT EXISTS admin_settings (
    section TEXT PRIMARY KEY,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    -- Email of the admin who last saved it.
    updated_by TEXT NOT NULL
);
