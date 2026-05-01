import type { AppLoadContext } from 'react-router'

// Helper to get D1 database from context
export function getDb(context: AppLoadContext): D1Database {
    return context.db
}

// ============================================================================
// TYPE DEFINITIONS (matching D1 schema)
// ============================================================================

export interface VotingSessionRow {
    id: string
    session_id: string
    year: string
    seed: number
    total_pairs: number
    input_sessionize_talk_ids_json: string
    current_index: number
    version: number
    round_number: number
    max_pairs_per_round: number
    created_at: string
    updated_at: string
}

export interface VoteRow {
    id: number
    session_id: string
    year: string
    vote_version: number
    round_number: number
    index_in_round: number
    vote: 'A' | 'B' | 'S'
    created_at: string
}

export interface VotingGlobalRow {
    id: string
    year: string
    number_sessions: number
    updated_at: string
}

export interface ValidationRunRow {
    id: string
    run_id: string
    year: string
    status: 'running' | 'completed' | 'incomplete'
    started_at: string
    completed_at: string | null
    last_updated_at: string
    total_sessions: number
    processed_sessions: number
    processed_rounds: number
    processed_votes: number
}

export interface ValidationGlobalRow {
    id: string
    is_running: number
    current_run_id: string | null
    last_run_id: string | null
    last_started_at: string | null
}

export interface TalkStatisticsRow {
    id: number
    run_id: string
    talk_id: string
    title: string
    times_seen_aggregated: number
    times_voted_for_aggregated: number
    times_voted_against_aggregated: number
    times_skipped_aggregated: number
    times_seen_v1: number
    times_voted_for_v1: number
    times_voted_against_v1: number
    times_skipped_v1: number
    times_seen_v2: number
    times_voted_for_v2: number
    times_voted_against_v2: number
    times_skipped_v2: number
    times_seen_v3: number
    times_voted_for_v3: number
    times_voted_against_v3: number
    times_skipped_v3: number
    times_seen_v4: number
    times_voted_for_v4: number
    times_voted_against_v4: number
    times_skipped_v4: number
    times_seen_v5: number
    times_voted_for_v5: number
    times_voted_against_v5: number
    times_skipped_v5: number
    last_updated_at: string
}

export interface VoteResultRow {
    id: number
    run_id: string
    session_id: string
    original_row_key: string
    talk_a: string
    talk_b: string
    vote: 'a' | 'b' | 'skip'
    timestamp: string
}

export interface TalkResultRow {
    id: number
    run_id: string
    talk_id: string
    rank: number
    wins: number
    losses: number
    total_votes: number
    win_pct: number | null
    loss_pct: number | null
    uploaded_at: string
}

export interface FairnessMetricsRow {
    id: number
    run_id: string
    version: 'aggregated' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5'
    metrics_json: string
    last_updated_at: string
}

export interface UnderrepresentedGroupsConfigRow {
    id: string
    selected_groups_json: string
    last_updated_at: string
    last_updated_year: string | null
}

export interface AnnouncementRow {
    id: number
    year: string
    row_key: string
    message: string
    created_time: string
    updated_time: string | null
    is_active: number
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Atomic increment for session counter. Returns the post-increment value so it
// can be used as a deterministic schedule seed for balanced voting sessions.
export async function incrementSessionCounter(db: D1Database, year: string): Promise<number> {
    const id = `global_${year}`
    const now = new Date().toISOString()

    const row = await db
        .prepare(
            `
        INSERT INTO voting_globals (id, year, number_sessions, updated_at)
        VALUES (?, ?, 1, ?)
        ON CONFLICT(year) DO UPDATE SET
            number_sessions = number_sessions + 1,
            updated_at = ?
        RETURNING number_sessions
    `,
        )
        .bind(id, year, now, now)
        .first<{ number_sessions: number }>()

    return row?.number_sessions ?? (await getSessionCounter(db, year))
}

// Get session counter
export async function getSessionCounter(db: D1Database, year: string): Promise<number> {
    const result = await db
        .prepare(
            `
        SELECT number_sessions FROM voting_globals WHERE year = ?
    `,
        )
        .bind(year)
        .first<{ number_sessions: number }>()

    return result?.number_sessions ?? 0
}

// Get voting session by session ID
export async function getVotingSessionById(db: D1Database, sessionId: string): Promise<VotingSessionRow | null> {
    return db
        .prepare(
            `
        SELECT * FROM voting_sessions WHERE session_id = ?
    `,
        )
        .bind(sessionId)
        .first<VotingSessionRow>()
}

// Create voting session
export async function createVotingSession(db: D1Database, session: Omit<VotingSessionRow, 'id'>): Promise<void> {
    const id = `session_${session.session_id}`
    await db
        .prepare(
            `
        INSERT INTO voting_sessions (
            id, session_id, year, seed, total_pairs,
            input_sessionize_talk_ids_json, current_index, version,
            round_number, max_pairs_per_round, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
        )
        .bind(
            id,
            session.session_id,
            session.year,
            session.seed,
            session.total_pairs,
            session.input_sessionize_talk_ids_json,
            session.current_index,
            session.version,
            session.round_number,
            session.max_pairs_per_round,
            session.created_at,
            session.updated_at,
        )
        .run()
}

// Update voting session index safely with version-based optimistic concurrency
export async function updateVotingSessionIndex(
    db: D1Database,
    sessionId: string,
    newCurrentIndex: number,
    newRoundNumber?: number,
): Promise<boolean> {
    const now = new Date().toISOString()

    if (newRoundNumber !== undefined) {
        // Update both round and index
        const result = await db
            .prepare(
                `
            UPDATE voting_sessions
            SET current_index = ?, round_number = ?, updated_at = ?
            WHERE session_id = ? AND (current_index < ? OR round_number < ?)
        `,
            )
            .bind(newCurrentIndex, newRoundNumber, now, sessionId, newCurrentIndex, newRoundNumber)
            .run()

        return (result.meta?.changes ?? 0) > 0
    } else {
        // Update only index
        const result = await db
            .prepare(
                `
            UPDATE voting_sessions
            SET current_index = ?, updated_at = ?
            WHERE session_id = ? AND current_index < ?
        `,
            )
            .bind(newCurrentIndex, now, sessionId, newCurrentIndex)
            .run()

        return (result.meta?.changes ?? 0) > 0
    }
}

// Record a vote
export async function recordVote(
    db: D1Database,
    sessionId: string,
    year: string,
    roundNumber: number,
    indexInRound: number,
    vote: 'A' | 'B' | 'S',
): Promise<void> {
    const now = new Date().toISOString()

    await db
        .prepare(
            `
        INSERT INTO votes (session_id, year, vote_version, round_number, index_in_round, vote, created_at)
        VALUES (?, ?, 2, ?, ?, ?, ?)
        ON CONFLICT(session_id, round_number, index_in_round) DO NOTHING
    `,
        )
        .bind(sessionId, year, roundNumber, indexInRound, vote, now)
        .run()
}

// Get all votes for a session
export async function getVotesForSession(db: D1Database, sessionId: string): Promise<VoteRow[]> {
    const result = await db
        .prepare(
            `
        SELECT * FROM votes WHERE session_id = ?
        ORDER BY round_number, index_in_round
    `,
        )
        .bind(sessionId)
        .all<VoteRow>()

    return result.results ?? []
}

// List all voting sessions (for validation)
export async function listVotingSessions(db: D1Database, year?: string, version?: number): Promise<VotingSessionRow[]> {
    const whereClauses: string[] = []
    const bindings: Array<string | number> = []

    if (year !== undefined) {
        whereClauses.push('year = ?')
        bindings.push(year)
    }

    if (version !== undefined) {
        whereClauses.push('version = ?')
        bindings.push(version)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const statement = db.prepare(
        `
        SELECT * FROM voting_sessions ${whereSql} ORDER BY created_at
    `,
    )
    const result =
        bindings.length > 0
            ? await statement.bind(...bindings).all<VotingSessionRow>()
            : await statement.all<VotingSessionRow>()

    return result.results ?? []
}
