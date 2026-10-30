-- Committee-entered profile values pulled from Jira, used to prefill the
-- portal's Company profile form.
--
-- Sponsors who answered the sponsorship team by email before the portal
-- existed already have their quote and socials in Jira. Without these, the
-- portal showed them an empty form and asked them to type it all again.
--
-- These are PREFILL ONLY and never authoritative: `sponsor_profiles` still
-- holds whatever the sponsor submits, and the portal keeps pushing that back
-- to Jira on save. The read falls back to these columns only while the
-- sponsor's own value is unset, exactly like the existing `sponsors.website`
-- does — which is why the sponsor's value can never be clobbered by a sync.
--
-- Socials are one JSON blob rather than five columns, matching
-- `sponsor_profiles.socials_json` and the manifest's `fields.socials` map:
-- the set of platforms is config, not schema.
ALTER TABLE sponsors ADD COLUMN jira_quote TEXT;
ALTER TABLE sponsors ADD COLUMN jira_socials_json TEXT;
