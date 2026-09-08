-- Distinguishes sponsors who have submitted the portal logistics form from
-- profiles that only contain website details/logo data. Once submitted, D1
-- is authoritative for every field in the full-form save, including fields
-- the sponsor deliberately cleared; untouched sponsors still fall back to
-- legacy logistics entered directly in Jira.
ALTER TABLE sponsor_profiles ADD COLUMN logistics_updated_at INTEGER;
