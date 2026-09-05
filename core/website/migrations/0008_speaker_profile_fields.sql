-- Speaker portal: reshape speaker_profiles to the real extra-info field list
--
-- Phase-1 guessed at generic fields (av_requirements, emergency contact,
-- accessibility notes) before the actual requirements existed. Nothing has
-- been submitted through the portal yet (pre-launch), so this drops and
-- recreates the table rather than ALTERing column by column.
--
-- Fields not sourced from Sessionize: name phonetic spelling, whether/how
-- they'll take audience questions, presentation format needs, recording
-- opt-out, intro (Sessionize bio vs custom), a catch-all note, dietary
-- requirements, and three RSVPs (speakers dinner, speaker training session,
-- meet the experts). Choice fields store the raw label; multi-select fields
-- (presentation details, speaker training sessions) store a JSON array.

DROP TABLE IF EXISTS speaker_profiles;

CREATE TABLE speaker_profiles (
    sessionize_id TEXT PRIMARY KEY,
    name_phonetic_spelling TEXT,
    -- 'Yes' | 'No' | 'Yes, moderated' | 'Undecided' | 'Other'
    questions_preference TEXT,
    questions_preference_other TEXT,
    -- JSON array of 'Video' | 'Audio' | 'Audience Participation' | 'Live Demo' | 'Other'
    presentation_details_json TEXT,
    presentation_details_other TEXT,
    opt_out_of_recording INTEGER NOT NULL DEFAULT 0,
    introduction_use_sessionize_bio INTEGER NOT NULL DEFAULT 1,
    introduction_custom_text TEXT,
    anything_else TEXT,
    dietary_requirements TEXT,
    -- 'Yes' | 'No' | 'Maybe'
    rsvp_speakers_dinner TEXT,
    -- JSON array of 'Session 1' | 'Session 2' | 'Session 3'
    rsvp_speaker_training_json TEXT,
    -- 'Yes' | 'No' | 'Maybe' | 'Other'
    register_meet_the_experts TEXT,
    register_meet_the_experts_other TEXT,
    -- Forward-compat bucket for fields added later without a migration.
    extra_json TEXT,
    completed_at INTEGER,
    updated_at INTEGER NOT NULL,
    -- Email of whoever submitted it — may be a co-presenter, not the subject.
    updated_by TEXT NOT NULL
);
