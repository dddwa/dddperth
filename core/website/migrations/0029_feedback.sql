-- Attendee feedback, collected at /feedback on the conference day and the day
-- after. Two kinds: about the conference as a whole, and about a single talk
-- or Meet the Experts session.
--
-- Everything is keyed by `year` so one conference's feedback never mixes with
-- another's.
--
-- `target_id` is the Sessionize session id for a talk, or an opaque
-- `mte-<hash>` for a Meet the Experts registrant (see
-- `app/lib/feedback/feedback-targets.server.ts`). Titles, times and speaker
-- names are deliberately *not* copied in: they're looked up from the agenda
-- when feedback is read, so an agenda fix after the fact shows up everywhere.
--
-- `submitter_id` is a random per-browser cookie id, not an identity. For talk
-- feedback it's part of the unique key: one response per browser per talk, and
-- a second attempt is refused (the form says "you have already submitted
-- feedback for this session") rather than counted twice.
-- Clearing cookies gets around it; it's a dedupe, not a defence.
--
-- Conference feedback deliberately has no such key: people come back with more
-- to say, and every submission is kept.

CREATE TABLE IF NOT EXISTS conference_feedback (
    id TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    submitter_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    best_thing TEXT,
    ideas TEXT,
    feedback TEXT,
    email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conference_feedback_year ON conference_feedback (year);

CREATE TABLE IF NOT EXISTS talk_feedback (
    id TEXT PRIMARY KEY,
    year TEXT NOT NULL,
    target_id TEXT NOT NULL,
    submitter_id TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    -- Passed on to the speaker after the committee has read it.
    speaker_feedback TEXT,
    -- For organisers only; never sent to the speaker.
    organiser_feedback TEXT,
    email TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    UNIQUE (year, target_id, submitter_id)
);

CREATE INDEX IF NOT EXISTS idx_talk_feedback_year ON talk_feedback (year, target_id);
