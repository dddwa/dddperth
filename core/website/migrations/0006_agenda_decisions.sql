-- Agenda planning decisions — the "Save Agenda" button on the agenda
-- planning screen persists whatever's currently held in the browser's
-- localStorage (status + manual overrides) for a validation run. Until
-- saved, decisions live only in localStorage; this table is the durable
-- copy other devices/reviewers see.

CREATE TABLE IF NOT EXISTS agenda_decisions (
    run_id TEXT NOT NULL,
    talk_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '' CHECK (status IN ('', 'locked', 'tentative', 'waitlist', 'declined')),
    um_override INTEGER,
    exp_override INTEGER,
    topic_override TEXT,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (run_id, talk_id)
);

CREATE INDEX IF NOT EXISTS idx_agenda_decisions_run_id ON agenda_decisions(run_id);
