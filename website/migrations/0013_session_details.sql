-- Speaker portal: session-level details move to their own table
--
-- Audience questions, presentation format, recording opt-out and "anything
-- else" apply to the session, not to an individual presenter — a
-- co-presenter filling these in was previously saving to their own separate
-- speaker_profiles row, duplicating the question per presenter instead of
-- sharing one answer. Moved to a new session_details table keyed by
-- sessionize_session_id. Nothing has been submitted through the portal yet
-- (pre-launch), so this drops the old columns rather than migrating data.
--
-- Also adds register_meet_the_experts_responded_at, the same "the RSVP was
-- submitted at all" marker as rsvp_speaker_training_responded_at — Meet the
-- Experts slot selection moved out to its own checklist item/modal, where an
-- empty slot selection is a valid, deliberate answer.

CREATE TABLE session_details (
    sessionize_session_id TEXT PRIMARY KEY,
    -- 'Yes' | 'No' | 'Yes, moderated' | 'Undecided' | 'Other'
    questions_preference TEXT,
    questions_preference_other TEXT,
    -- JSON array of 'Video' | 'Audio' | 'Audience Participation' | 'Live Demo' | 'Other'
    presentation_details_json TEXT,
    presentation_details_other TEXT,
    opt_out_of_recording INTEGER NOT NULL DEFAULT 0,
    anything_else TEXT,
    updated_at INTEGER NOT NULL,
    -- Email of whoever last submitted it — may be any presenter on the session.
    updated_by TEXT NOT NULL
);

ALTER TABLE speaker_profiles DROP COLUMN questions_preference;
ALTER TABLE speaker_profiles DROP COLUMN questions_preference_other;
ALTER TABLE speaker_profiles DROP COLUMN presentation_details_json;
ALTER TABLE speaker_profiles DROP COLUMN presentation_details_other;
ALTER TABLE speaker_profiles DROP COLUMN opt_out_of_recording;
ALTER TABLE speaker_profiles DROP COLUMN anything_else;

ALTER TABLE speaker_profiles ADD COLUMN register_meet_the_experts_responded_at INTEGER;
