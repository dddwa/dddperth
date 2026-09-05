-- Speaker portal: Meet-the-Experts slot selection + explicit training-RSVP marker
--
-- Meet-the-Experts registration now includes which time-block(s) a speaker
-- wants (register_meet_the_experts_slots_json, same JSON-array idiom as the
-- other multi-select fields). Speaker-training RSVP moved out to its own
-- modal/action where an empty session selection ("not attending any") is a
-- valid, deliberate answer — rsvp_speaker_training_responded_at marks that
-- the RSVP was submitted at all, since session count alone can no longer
-- tell "not attending" apart from "hasn't looked at it yet".

ALTER TABLE speaker_profiles ADD COLUMN register_meet_the_experts_slots_json TEXT;
ALTER TABLE speaker_profiles ADD COLUMN rsvp_speaker_training_responded_at INTEGER;
