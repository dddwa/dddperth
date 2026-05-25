-- DDD Perth Voting System - D1 Schema
-- Migrated from Azure Table Storage

-- ============================================================================
-- VOTING SESSIONS
-- ============================================================================

-- Voting sessions - tracks individual user voting sessions
CREATE TABLE IF NOT EXISTS voting_sessions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    year TEXT NOT NULL,
    seed INTEGER NOT NULL,
    total_pairs INTEGER NOT NULL,
    input_sessionize_talk_ids_json TEXT NOT NULL,
    current_index INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 4,
    round_number INTEGER NOT NULL DEFAULT 0,
    max_pairs_per_round INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_voting_sessions_year ON voting_sessions(year);
CREATE INDEX IF NOT EXISTS idx_voting_sessions_session_id ON voting_sessions(session_id);

-- ============================================================================
-- VOTES
-- ============================================================================

-- Vote records - individual votes within sessions
CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    year TEXT NOT NULL,
    vote_version INTEGER NOT NULL DEFAULT 2,
    round_number INTEGER NOT NULL,
    index_in_round INTEGER NOT NULL,
    vote TEXT NOT NULL CHECK (vote IN ('A', 'B', 'S')),
    created_at TEXT NOT NULL,
    UNIQUE(session_id, round_number, index_in_round)
);

CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_year ON votes(year);

-- ============================================================================
-- GLOBAL COUNTERS
-- ============================================================================

-- Voting globals - global counters for voting (e.g., total sessions)
CREATE TABLE IF NOT EXISTS voting_globals (
    id TEXT PRIMARY KEY,
    year TEXT NOT NULL UNIQUE,
    number_sessions INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
);

-- ============================================================================
-- VALIDATION SYSTEM
-- ============================================================================

-- Voting validation runs - tracks validation run metadata
CREATE TABLE IF NOT EXISTS voting_validation_runs (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL UNIQUE,
    year TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'incomplete')),
    started_at TEXT NOT NULL,
    completed_at TEXT,
    last_updated_at TEXT NOT NULL,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    processed_sessions INTEGER NOT NULL DEFAULT 0,
    processed_rounds INTEGER NOT NULL DEFAULT 0,
    processed_votes INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_validation_runs_year ON voting_validation_runs(year);
CREATE INDEX IF NOT EXISTS idx_validation_runs_started_at ON voting_validation_runs(started_at DESC);

-- Voting validation global status
CREATE TABLE IF NOT EXISTS voting_validation_globals (
    id TEXT PRIMARY KEY DEFAULT 'global',
    is_running INTEGER NOT NULL DEFAULT 0,
    current_run_id TEXT,
    last_run_id TEXT,
    last_started_at TEXT
);

-- ============================================================================
-- TALK STATISTICS
-- ============================================================================

-- Talk statistics from validation runs
CREATE TABLE IF NOT EXISTS talk_statistics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    talk_id TEXT NOT NULL,
    title TEXT NOT NULL,
    -- Aggregated stats (all versions)
    times_seen_aggregated INTEGER NOT NULL DEFAULT 0,
    times_voted_for_aggregated INTEGER NOT NULL DEFAULT 0,
    times_voted_against_aggregated INTEGER NOT NULL DEFAULT 0,
    times_skipped_aggregated INTEGER NOT NULL DEFAULT 0,
    -- V1 stats
    times_seen_v1 INTEGER NOT NULL DEFAULT 0,
    times_voted_for_v1 INTEGER NOT NULL DEFAULT 0,
    times_voted_against_v1 INTEGER NOT NULL DEFAULT 0,
    times_skipped_v1 INTEGER NOT NULL DEFAULT 0,
    -- V2 stats
    times_seen_v2 INTEGER NOT NULL DEFAULT 0,
    times_voted_for_v2 INTEGER NOT NULL DEFAULT 0,
    times_voted_against_v2 INTEGER NOT NULL DEFAULT 0,
    times_skipped_v2 INTEGER NOT NULL DEFAULT 0,
    -- V3 stats
    times_seen_v3 INTEGER NOT NULL DEFAULT 0,
    times_voted_for_v3 INTEGER NOT NULL DEFAULT 0,
    times_voted_against_v3 INTEGER NOT NULL DEFAULT 0,
    times_skipped_v3 INTEGER NOT NULL DEFAULT 0,
    -- V4 stats
    times_seen_v4 INTEGER NOT NULL DEFAULT 0,
    times_voted_for_v4 INTEGER NOT NULL DEFAULT 0,
    times_voted_against_v4 INTEGER NOT NULL DEFAULT 0,
    times_skipped_v4 INTEGER NOT NULL DEFAULT 0,
    last_updated_at TEXT NOT NULL,
    UNIQUE(run_id, talk_id)
);

CREATE INDEX IF NOT EXISTS idx_talk_statistics_run_id ON talk_statistics(run_id);

-- ============================================================================
-- VOTE RESULTS (from validation)
-- ============================================================================

-- Vote results - processed votes from validation runs
CREATE TABLE IF NOT EXISTS vote_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    original_row_key TEXT NOT NULL,
    talk_a TEXT NOT NULL,
    talk_b TEXT NOT NULL,
    vote TEXT NOT NULL CHECK (vote IN ('a', 'b', 'skip')),
    timestamp TEXT NOT NULL,
    UNIQUE(run_id, session_id, original_row_key)
);

CREATE INDEX IF NOT EXISTS idx_vote_results_run_id ON vote_results(run_id);

-- ============================================================================
-- TALK RESULTS (ELO rankings)
-- ============================================================================

-- Talk results - final rankings from ELO calculation
CREATE TABLE IF NOT EXISTS talk_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    talk_id TEXT NOT NULL,
    rank INTEGER NOT NULL,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    total_votes INTEGER NOT NULL DEFAULT 0,
    win_pct REAL,
    loss_pct REAL,
    uploaded_at TEXT NOT NULL,
    UNIQUE(run_id, talk_id)
);

CREATE INDEX IF NOT EXISTS idx_talk_results_run_id ON talk_results(run_id);
CREATE INDEX IF NOT EXISTS idx_talk_results_rank ON talk_results(run_id, rank);

-- ============================================================================
-- FAIRNESS METRICS
-- ============================================================================

-- Fairness metrics - statistical analysis of vote distribution
CREATE TABLE IF NOT EXISTS fairness_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    version TEXT NOT NULL CHECK (version IN ('aggregated', 'v1', 'v2', 'v3', 'v4')),
    metrics_json TEXT NOT NULL,
    last_updated_at TEXT NOT NULL,
    UNIQUE(run_id, version)
);

CREATE INDEX IF NOT EXISTS idx_fairness_metrics_run_id ON fairness_metrics(run_id);

-- ============================================================================
-- CONFIGURATION
-- ============================================================================

-- Underrepresented groups config
CREATE TABLE IF NOT EXISTS underrepresented_groups_config (
    id TEXT PRIMARY KEY DEFAULT 'config',
    selected_groups_json TEXT NOT NULL DEFAULT '[]',
    last_updated_at TEXT NOT NULL,
    last_updated_year TEXT
);

-- ============================================================================
-- ANNOUNCEMENTS
-- ============================================================================

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year TEXT NOT NULL,
    row_key TEXT NOT NULL,
    message TEXT NOT NULL,
    created_time TEXT NOT NULL,
    updated_time TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    UNIQUE(year, row_key)
);

CREATE INDEX IF NOT EXISTS idx_announcements_year ON announcements(year);
CREATE INDEX IF NOT EXISTS idx_announcements_active ON announcements(year, is_active);
