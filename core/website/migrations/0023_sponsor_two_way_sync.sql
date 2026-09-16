-- Records whether the sponsor has submitted the details form. Jira remains a
-- display-only prefill before that point. After submission, Jira syncs copy
-- the canonical field values (including clears) into sponsor_profiles.
ALTER TABLE sponsor_profiles ADD COLUMN details_updated_at INTEGER;

-- Existing non-empty detail rows were created only by saveDetails, so mark
-- them as submitted. A logo-only profile has all three columns null and stays
-- on the Jira-prefill path.
UPDATE sponsor_profiles
SET details_updated_at = updated_at
WHERE blurb IS NOT NULL OR website_url IS NOT NULL OR socials_json IS NOT NULL;
