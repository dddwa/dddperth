-- Speaker portal: Meet the Experts gets its own bio/description
--
-- Same "use my Sessionize bio as-is, or write a custom one" idiom as the
-- session-details modal's introduction field (introduction_use_sessionize_bio
-- / introduction_custom_text) — but scoped to Meet the Experts, since what a
-- speaker wants attendees to know for a Meet-the-Experts chat isn't always
-- the same text as their on-stage intro.

ALTER TABLE speaker_profiles ADD COLUMN meet_the_experts_bio_use_sessionize_bio INTEGER NOT NULL DEFAULT 1;
ALTER TABLE speaker_profiles ADD COLUMN meet_the_experts_bio_custom_text TEXT;
