-- Meet the Experts: shared table for speaker + sponsor registrations
--
-- Meet-the-Experts slot/bio registration used to live entirely on
-- speaker_profiles. Sponsors can now register too, so it moves into its own
-- table keyed by (registrant_type, registrant_id) — sessionize_id for a
-- speaker, issue_key for a sponsor. The speaker-only opt-in question
-- (register_meet_the_experts / _other, asked on the main session-details
-- form) stays on speaker_profiles untouched.
--
-- The portal is live, so this backfills existing speaker registrations
-- before dropping the old columns rather than dropping them outright.

CREATE TABLE IF NOT EXISTS meet_the_experts_registrations (
    registrant_type TEXT NOT NULL CHECK (registrant_type IN ('speaker', 'sponsor')),
    registrant_id TEXT NOT NULL,
    slots_json TEXT,
    bio_use_default INTEGER NOT NULL DEFAULT 1,
    bio_custom_text TEXT,
    responded_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    updated_by TEXT NOT NULL,
    PRIMARY KEY (registrant_type, registrant_id)
);

INSERT INTO meet_the_experts_registrations
    (registrant_type, registrant_id, slots_json, bio_use_default, bio_custom_text, responded_at, updated_at, updated_by)
SELECT 'speaker', sessionize_id, register_meet_the_experts_slots_json,
       meet_the_experts_bio_use_sessionize_bio, meet_the_experts_bio_custom_text,
       register_meet_the_experts_responded_at, updated_at, updated_by
FROM speaker_profiles
WHERE register_meet_the_experts_responded_at IS NOT NULL;

ALTER TABLE speaker_profiles DROP COLUMN register_meet_the_experts_slots_json;
ALTER TABLE speaker_profiles DROP COLUMN register_meet_the_experts_responded_at;
ALTER TABLE speaker_profiles DROP COLUMN meet_the_experts_bio_use_sessionize_bio;
ALTER TABLE speaker_profiles DROP COLUMN meet_the_experts_bio_custom_text;
