-- Add V5 voting validation fields and allow V5 fairness metrics.

ALTER TABLE talk_statistics ADD COLUMN times_seen_v5 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE talk_statistics ADD COLUMN times_voted_for_v5 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE talk_statistics ADD COLUMN times_voted_against_v5 INTEGER NOT NULL DEFAULT 0;
ALTER TABLE talk_statistics ADD COLUMN times_skipped_v5 INTEGER NOT NULL DEFAULT 0;

CREATE TABLE fairness_metrics_v5 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    version TEXT NOT NULL CHECK (version IN ('aggregated', 'v1', 'v2', 'v3', 'v4', 'v5')),
    metrics_json TEXT NOT NULL,
    last_updated_at TEXT NOT NULL,
    UNIQUE(run_id, version)
);

INSERT INTO fairness_metrics_v5 (id, run_id, version, metrics_json, last_updated_at)
SELECT id, run_id, version, metrics_json, last_updated_at
FROM fairness_metrics;

DROP TABLE fairness_metrics;

ALTER TABLE fairness_metrics_v5 RENAME TO fairness_metrics;

CREATE INDEX IF NOT EXISTS idx_fairness_metrics_run_id ON fairness_metrics(run_id);
