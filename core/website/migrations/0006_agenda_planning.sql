-- Shared agenda planning
--
-- Everything organizers decide on /admin/voting/agenda/:runId used to live in
-- each reviewer's localStorage, so two people planning the same run couldn't
-- see each other's work. These four tables move that state server-side and
-- key it by validation run:
--
--   agenda_talk_planning — per-talk status + the UM/experience/topic overrides
--   agenda_track         — a column on the planner board
--   agenda_slot          — a card within a track, holding at most one talk
--   agenda_planner_capacity — capacity targets, keyed by slot length
--
-- Writes are last-write-wins: the organizer team is small and edits are
-- per-talk/per-slot, so a row-level clobber is the worst case rather than a
-- whole-board one. updated_by_email/updated_at are kept so the UI can show
-- who last touched something.
--
-- Tracks and slots are relational rather than one JSON blob so two people
-- rearranging different parts of the board don't overwrite each other.
-- talk_id is deliberately NOT a foreign key: talks come from Sessionize (via
-- voting_talk_results), can vanish from the feed mid-planning, and the board
-- should survive that.

-- Per-talk planning decisions. Status '' (empty) is a real, meaningful value:
-- it means "explicitly cleared", which is different from having no row at all
-- (the latter falls back to the Sessionize-declined default in the UI).
CREATE TABLE IF NOT EXISTS agenda_talk_planning (
    run_id TEXT NOT NULL,
    talk_id TEXT NOT NULL,
    -- '', 'locked', 'tentative', 'waitlist' or 'declined'. NULL means the
    -- reviewer never set a status, so the computed default applies.
    status TEXT,
    -- Manual overrides of the computed flags. NULL = no override, fall back
    -- to what Sessionize + the underrepresented-groups config imply.
    um_override INTEGER,
    exp_override INTEGER,
    topic_override TEXT,
    updated_at TEXT NOT NULL,
    updated_by_email TEXT,
    PRIMARY KEY (run_id, talk_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_talk_planning_run ON agenda_talk_planning (run_id);

-- A column on the planner board. position orders the tracks left-to-right.
CREATE TABLE IF NOT EXISTS agenda_track (
    run_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    name TEXT NOT NULL,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by_email TEXT,
    PRIMARY KEY (run_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_track_run ON agenda_track (run_id, position);

-- A slot within a track. length is a free-form Sessionize "Session format"
-- value ("45 minutes") so capacity planning lines up with the Length stats
-- without hardcoding a list. talk_id NULL means the slot is empty.
CREATE TABLE IF NOT EXISTS agenda_slot (
    run_id TEXT NOT NULL,
    slot_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    length TEXT NOT NULL,
    talk_id TEXT,
    position INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by_email TEXT,
    PRIMARY KEY (run_id, slot_id),
    FOREIGN KEY (run_id, track_id) REFERENCES agenda_track (run_id, track_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agenda_slot_track ON agenda_slot (run_id, track_id, position);

-- A talk may only sit in one slot at a time — enforced in the DB so a racing
-- double-drop can't duplicate it across the board. Partial index so the many
-- empty slots (talk_id NULL) don't collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS idx_agenda_slot_talk_unique
    ON agenda_slot (run_id, talk_id)
    WHERE talk_id IS NOT NULL;

-- Capacity targets per slot length, e.g. "45 minutes" -> 12.
CREATE TABLE IF NOT EXISTS agenda_planner_capacity (
    run_id TEXT NOT NULL,
    length TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    updated_by_email TEXT,
    PRIMARY KEY (run_id, length)
);
