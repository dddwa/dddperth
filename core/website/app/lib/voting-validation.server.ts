import { recordException } from './record-exception'

import { batchReconstructVoteContexts, removeVotesOnDuplicatedTalksInRound } from './voting-reconstruction.server'
import { CURRENT_SESSION_VERSION } from './voting-version-constants'
import type {
    EloResultImport,
    FairnessMetrics,
    TalkResult,
    TalkStatistics,
    TalkStatsAccumulator,
    ValidationRunIndex,
    VoteResult,
} from './voting-validation-types'
import { getVotesForSession, listVotingSessions } from './d1.server'
import { rowToVoteRecord, rowToVotingSession } from './services/cloudflare/row-converters.server'
import type { TalkVotingData, VoteRecord, VotingSession } from './voting-types'

// ============================================================================
// VALIDATION GLOBAL STATE
// ============================================================================

export async function canStartValidation(db: D1Database): Promise<{
    canStart: boolean
    reason?: string
    currentRunId?: string
}> {
    try {
        const row = await db
            .prepare(`SELECT * FROM voting_validation_globals WHERE id = 'global'`)
            .first<{ is_running: number; current_run_id: string | null; last_started_at: string | null }>()

        if (!row || !row.is_running) {
            return { canStart: true }
        }

        // Check if the current run is stale (hasn't been updated in 30 minutes)
        if (row.current_run_id && row.last_started_at) {
            const lastUpdate = new Date(row.last_started_at)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

            if (lastUpdate < thirtyMinutesAgo) {
                // Check the actual run status
                try {
                    const runRow = await db
                        .prepare(
                            `SELECT last_updated_at, status FROM voting_validation_runs WHERE run_id = ?`,
                        )
                        .bind(row.current_run_id)
                        .first<{ last_updated_at: string; status: string }>()

                    if (!runRow) {
                        return { canStart: true, reason: 'Previous run index not found' }
                    }

                    const runLastUpdate = new Date(runRow.last_updated_at)
                    if (runLastUpdate < thirtyMinutesAgo && runRow.status === 'running') {
                        return { canStart: true, reason: 'Previous run appears to be stale' }
                    }
                } catch (error: any) {
                    recordException(error)
                    return { canStart: true, reason: 'Previous run index not found' }
                }
            }
        }

        return {
            canStart: false,
            reason: 'Validation is already running',
            currentRunId: row.current_run_id ?? undefined,
        }
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function markValidationStarted(db: D1Database, runId: string): Promise<void> {
    const now = new Date().toISOString()
    await db
        .prepare(
            `INSERT INTO voting_validation_globals (id, is_running, current_run_id, last_started_at)
             VALUES ('global', 1, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 is_running = 1,
                 current_run_id = excluded.current_run_id,
                 last_started_at = excluded.last_started_at`,
        )
        .bind(runId, now)
        .run()
}

export async function markValidationCompleted(db: D1Database, runId: string): Promise<void> {
    const now = new Date().toISOString()
    await db
        .prepare(
            `INSERT INTO voting_validation_globals (id, is_running, last_run_id, last_started_at)
             VALUES ('global', 0, ?, ?)
             ON CONFLICT(id) DO UPDATE SET
                 is_running = 0,
                 last_run_id = excluded.last_run_id,
                 current_run_id = NULL,
                 last_started_at = excluded.last_started_at`,
        )
        .bind(runId, now)
        .run()
}

// ============================================================================
// VALIDATION RUN MANAGEMENT
// ============================================================================

export async function createValidationRunIndex(
    db: D1Database,
    runId: string,
    year: string,
    totalSessions: number,
): Promise<void> {
    const now = new Date().toISOString()
    const id = `run_${runId}`
    await db
        .prepare(
            `INSERT INTO voting_validation_runs
                 (id, run_id, year, status, started_at, last_updated_at, total_sessions, processed_sessions, processed_rounds, processed_votes)
             VALUES (?, ?, ?, 'running', ?, ?, ?, 0, 0, 0)`,
        )
        .bind(id, runId, year, now, now, totalSessions)
        .run()
}

export async function updateValidationRunProgress(
    db: D1Database,
    runId: string,
    processedSessions: number,
    processedRounds: number,
    processedVotes: number,
    status?: 'running' | 'completed' | 'incomplete',
): Promise<void> {
    const now = new Date().toISOString()

    if (status === 'completed') {
        await db
            .prepare(
                `UPDATE voting_validation_runs
                 SET processed_sessions = ?, processed_rounds = ?, processed_votes = ?,
                     last_updated_at = ?, status = 'completed', completed_at = ?
                 WHERE run_id = ?`,
            )
            .bind(processedSessions, processedRounds, processedVotes, now, now, runId)
            .run()
    } else if (status === 'incomplete') {
        await db
            .prepare(
                `UPDATE voting_validation_runs
                 SET processed_sessions = ?, processed_rounds = ?, processed_votes = ?,
                     last_updated_at = ?, status = 'incomplete'
                 WHERE run_id = ?`,
            )
            .bind(processedSessions, processedRounds, processedVotes, now, runId)
            .run()
    } else {
        await db
            .prepare(
                `UPDATE voting_validation_runs
                 SET processed_sessions = ?, processed_rounds = ?, processed_votes = ?,
                     last_updated_at = ?
                 WHERE run_id = ?`,
            )
            .bind(processedSessions, processedRounds, processedVotes, now, runId)
            .run()
    }
}

// ============================================================================
// SESSION PROCESSING
// ============================================================================

export async function processVotingSession(
    db: D1Database,
    runId: string,
    session: VotingSession,
    talks: TalkVotingData[],
): Promise<{
    talkStats: Map<string, TalkStatsAccumulator>
    processedRounds: number
    processedVotes: number
}> {
    const stats = new Map<string, TalkStatsAccumulator>()

    // Initialize stats for all talks
    talks.forEach((talk) => {
        stats.set(talk.id, {
            talkId: talk.id,
            title: talk.title,
            timesSeenAggregated: 0,
            timesVotedForAggregated: 0,
            timesVotedAgainstAggregated: 0,
            timesSkippedAggregated: 0,
            timesSeenV1: 0,
            timesVotedForV1: 0,
            timesVotedAgainstV1: 0,
            timesSkippedV1: 0,
            timesSeenV2: 0,
            timesVotedForV2: 0,
            timesVotedAgainstV2: 0,
            timesSkippedV2: 0,
            timesSeenV3: 0,
            timesVotedForV3: 0,
            timesVotedAgainstV3: 0,
            timesSkippedV3: 0,
            timesSeenV4: 0,
            timesVotedForV4: 0,
            timesVotedAgainstV4: 0,
            timesSkippedV4: 0,
            timesSeenV5: 0,
            timesVotedForV5: 0,
            timesVotedAgainstV5: 0,
            timesSkippedV5: 0,
        })
    })

    const sessionTalkIds = JSON.parse(session.inputSessionizeTalkIdsJson) as string[]
    const sessionTalks = talks.filter((t) => sessionTalkIds.includes(t.id))

    let votesProcessed = 0
    let totalRounds = 1

    try {
        // Get all votes for this session from D1
        const voteRows = await getVotesForSession(db, session.sessionId)
        const allVotes: VoteRecord[] = voteRows.map(rowToVoteRecord)

        // Use efficient batch reconstruction
        const mappedVotes = batchReconstructVoteContexts(allVotes, session, sessionTalks)
        const cleanedVotes = removeVotesOnDuplicatedTalksInRound(mappedVotes)

        // Collect vote results to save later
        const voteResults: Array<{
            runId: string
            sessionId: string
            originalRowKey: string
            talkA: string
            talkB: string
            vote: 'a' | 'b' | 'skip'
            timestamp: string
        }> = []

        // Process each vote using pre-computed contexts
        for (const vote of cleanedVotes) {
            const leftTalk = vote.pair.left
            const rightTalk = vote.pair.right

            updateTalkStats(stats, leftTalk.id, rightTalk.id, vote.vote, CURRENT_SESSION_VERSION)
            votesProcessed++
            if (vote.roundNumber >= totalRounds) {
                totalRounds = vote.roundNumber + 1
            }

            // Create vote result for storage — use round/index as the row key equivalent
            const originalRowKey = `r${vote.originalVoteRecord.roundNumber}_i${vote.originalVoteRecord.indexInRound}`
            voteResults.push({
                runId,
                sessionId: session.sessionId,
                originalRowKey,
                talkA: leftTalk.id,
                talkB: rightTalk.id,
                vote: vote.vote === 'A' ? 'a' : vote.vote === 'B' ? 'b' : 'skip',
                timestamp: vote.timestamp,
            })
        }

        // Save vote results in batches
        await saveVoteResults(db, voteResults)
    } catch (error: any) {
        console.error(`Error processing votes for session ${session.sessionId}:`, error)
        recordException(error)
    }

    return {
        talkStats: stats,
        processedRounds: totalRounds,
        processedVotes: votesProcessed,
    }
}

// ============================================================================
// STATISTICAL ANALYSIS
// ============================================================================

export function calculateFairnessMetrics(appearances: number[]): FairnessMetrics {
    const n = appearances.length
    const total = appearances.reduce((sum, count) => sum + count, 0)
    const mean = total / n

    // Standard deviation
    const variance = appearances.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / n
    const stdDev = Math.sqrt(variance)

    // Coefficient of variation (relative measure of dispersion)
    const cv = stdDev / mean

    // Gini coefficient (0 = perfect equality, 1 = perfect inequality)
    const sortedAppearances = [...appearances].sort((a, b) => a - b)
    let giniSum = 0
    for (let i = 0; i < n; i++) {
        giniSum += (2 * (i + 1) - n - 1) * sortedAppearances[i]
    }
    const gini = giniSum / (n * total)

    // Range analysis
    const min = Math.min(...appearances)
    const max = Math.max(...appearances)
    const range = max - min

    // Chi-square test for uniformity
    const expected = mean
    const chiSquare = appearances.reduce((sum, observed) => {
        return sum + Math.pow(observed - expected, 2) / expected
    }, 0)

    // Rough p-value approximation (proper calculation would need chi-square distribution table)
    const degreesOfFreedom = n - 1
    const isUniform = chiSquare < degreesOfFreedom // Simplified test
    const pValue = chiSquare / degreesOfFreedom // Simplified approximation

    return {
        totalTalks: n,
        meanAppearances: mean,
        standardDeviation: stdDev,
        coefficientOfVariation: cv,
        giniCoefficient: Math.abs(gini),
        minAppearances: min,
        maxAppearances: max,
        range,
        isDistributionUniform: isUniform,
        chiSquareStatistic: chiSquare,
        pValue,
    }
}

// Helper function to update vote counts based on vote type
function applyVoteUpdate(
    leftStats: TalkStatsAccumulator,
    rightStats: TalkStatsAccumulator,
    vote: 'A' | 'B' | 'S',
    versionKey: 'Aggregated' | 'V1' | 'V2' | 'V3' | 'V4' | 'V5',
): void {
    // Type-safe property access using bracket notation
    const seenKey = `timesSeen${versionKey}` as keyof TalkStatsAccumulator
    const votedForKey = `timesVotedFor${versionKey}` as keyof TalkStatsAccumulator
    const votedAgainstKey = `timesVotedAgainst${versionKey}` as keyof TalkStatsAccumulator
    const skippedKey = `timesSkipped${versionKey}` as keyof TalkStatsAccumulator

    // Update times seen
    leftStats[seenKey]++
    rightStats[seenKey]++

    // Update vote counts based on vote type
    if (vote === 'A') {
        leftStats[votedForKey]++
        rightStats[votedAgainstKey]++
    } else if (vote === 'B') {
        leftStats[votedAgainstKey]++
        rightStats[votedForKey]++
    } else {
        leftStats[skippedKey]++
        rightStats[skippedKey]++
    }
}

// Update talk statistics based on vote
function updateTalkStats(
    stats: Map<string, TalkStatsAccumulator>,
    leftTalkId: string,
    rightTalkId: string,
    vote: 'A' | 'B' | 'S',
    sessionVersion: typeof CURRENT_SESSION_VERSION,
): void {
    const leftStats = stats.get(leftTalkId)
    const rightStats = stats.get(rightTalkId)

    if (!leftStats || !rightStats) return

    // Update AGGREGATED stats (all versions combined)
    applyVoteUpdate(leftStats, rightStats, vote, 'Aggregated')

    // Update specific version stats
    const versionKey = `V${sessionVersion}` as const
    applyVoteUpdate(leftStats, rightStats, vote, versionKey)
}

// ============================================================================
// VOTE RESULTS
// ============================================================================

async function saveVoteResults(
    db: D1Database,
    voteResults: Array<{
        runId: string
        sessionId: string
        originalRowKey: string
        talkA: string
        talkB: string
        vote: 'a' | 'b' | 'skip'
        timestamp: string
    }>,
): Promise<void> {
    // Save in batches of 20
    const batchSize = 20
    for (let i = 0; i < voteResults.length; i += batchSize) {
        const batch = voteResults.slice(i, i + batchSize)
        const statements = batch.map((r) =>
            db
                .prepare(
                    `INSERT INTO vote_results (run_id, session_id, original_row_key, talk_a, talk_b, vote, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(run_id, session_id, original_row_key) DO NOTHING`,
                )
                .bind(r.runId, r.sessionId, r.originalRowKey, r.talkA, r.talkB, r.vote, r.timestamp),
        )
        await db.batch(statements)
    }
}

export async function getVoteResults(db: D1Database, runId: string): Promise<VoteResult[]> {
    const result = await db
        .prepare(`SELECT * FROM vote_results WHERE run_id = ? ORDER BY id`)
        .bind(runId)
        .all<{
            id: number
            run_id: string
            session_id: string
            original_row_key: string
            talk_a: string
            talk_b: string
            vote: 'a' | 'b' | 'skip'
            timestamp: string
        }>()

    return (result.results ?? []).map((row) => ({
        partitionKey: `vote_result_${row.run_id}` as const,
        rowKey: `${row.session_id}_${row.original_row_key}`,
        a: row.talk_a,
        b: row.talk_b,
        vote: row.vote,
        timestamp: row.timestamp,
    }))
}

// ============================================================================
// TALK STATISTICS
// ============================================================================

export async function saveTalkStatistics(
    db: D1Database,
    runId: string,
    stats: Map<string, TalkStatsAccumulator>,
): Promise<void> {
    const timestamp = new Date().toISOString()
    const entries = Array.from(stats.entries())

    // Save in batches of 20
    const batchSize = 20
    for (let i = 0; i < entries.length; i += batchSize) {
        const batch = entries.slice(i, i + batchSize)
        const statements = batch.map(([, acc]) =>
            db
                .prepare(
                    `INSERT INTO talk_statistics (
                         run_id, talk_id, title,
                         times_seen_aggregated, times_voted_for_aggregated, times_voted_against_aggregated, times_skipped_aggregated,
                         times_seen_v1, times_voted_for_v1, times_voted_against_v1, times_skipped_v1,
                         times_seen_v2, times_voted_for_v2, times_voted_against_v2, times_skipped_v2,
                         times_seen_v3, times_voted_for_v3, times_voted_against_v3, times_skipped_v3,
                         times_seen_v4, times_voted_for_v4, times_voted_against_v4, times_skipped_v4,
                         times_seen_v5, times_voted_for_v5, times_voted_against_v5, times_skipped_v5,
                         last_updated_at
                     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(run_id, talk_id) DO UPDATE SET
                         times_seen_aggregated = excluded.times_seen_aggregated,
                         times_voted_for_aggregated = excluded.times_voted_for_aggregated,
                         times_voted_against_aggregated = excluded.times_voted_against_aggregated,
                         times_skipped_aggregated = excluded.times_skipped_aggregated,
                         times_seen_v1 = excluded.times_seen_v1,
                         times_voted_for_v1 = excluded.times_voted_for_v1,
                         times_voted_against_v1 = excluded.times_voted_against_v1,
                         times_skipped_v1 = excluded.times_skipped_v1,
                         times_seen_v2 = excluded.times_seen_v2,
                         times_voted_for_v2 = excluded.times_voted_for_v2,
                         times_voted_against_v2 = excluded.times_voted_against_v2,
                         times_skipped_v2 = excluded.times_skipped_v2,
                         times_seen_v3 = excluded.times_seen_v3,
                         times_voted_for_v3 = excluded.times_voted_for_v3,
                         times_voted_against_v3 = excluded.times_voted_against_v3,
                         times_skipped_v3 = excluded.times_skipped_v3,
                         times_seen_v4 = excluded.times_seen_v4,
                         times_voted_for_v4 = excluded.times_voted_for_v4,
                         times_voted_against_v4 = excluded.times_voted_against_v4,
                         times_skipped_v4 = excluded.times_skipped_v4,
                         times_seen_v5 = excluded.times_seen_v5,
                         times_voted_for_v5 = excluded.times_voted_for_v5,
                         times_voted_against_v5 = excluded.times_voted_against_v5,
                         times_skipped_v5 = excluded.times_skipped_v5,
                         last_updated_at = excluded.last_updated_at`,
                )
                .bind(
                    runId,
                    acc.talkId,
                    acc.title,
                    acc.timesSeenAggregated,
                    acc.timesVotedForAggregated,
                    acc.timesVotedAgainstAggregated,
                    acc.timesSkippedAggregated,
                    acc.timesSeenV1,
                    acc.timesVotedForV1,
                    acc.timesVotedAgainstV1,
                    acc.timesSkippedV1,
                    acc.timesSeenV2,
                    acc.timesVotedForV2,
                    acc.timesVotedAgainstV2,
                    acc.timesSkippedV2,
                    acc.timesSeenV3,
                    acc.timesVotedForV3,
                    acc.timesVotedAgainstV3,
                    acc.timesSkippedV3,
                    acc.timesSeenV4,
                    acc.timesVotedForV4,
                    acc.timesVotedAgainstV4,
                    acc.timesSkippedV4,
                    acc.timesSeenV5,
                    acc.timesVotedForV5,
                    acc.timesVotedAgainstV5,
                    acc.timesSkippedV5,
                    timestamp,
                ),
        )
        await db.batch(statements)
    }
}

export async function getTalkStatistics(db: D1Database, runId: string): Promise<TalkStatistics[]> {
    const result = await db
        .prepare(
            `SELECT * FROM talk_statistics WHERE run_id = ? ORDER BY talk_id`,
        )
        .bind(runId)
        .all<{
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
        }>()

    return (result.results ?? []).map((row) => ({
        partitionKey: 'talk_stats' as const,
        rowKey: `${row.run_id}_talk_${row.talk_id}`,
        runId: row.run_id,
        talkId: row.talk_id,
        title: row.title,
        timesSeenAggregated: row.times_seen_aggregated,
        timesVotedForAggregated: row.times_voted_for_aggregated,
        timesVotedAgainstAggregated: row.times_voted_against_aggregated,
        timesSkippedAggregated: row.times_skipped_aggregated,
        timesSeenV1: row.times_seen_v1,
        timesVotedForV1: row.times_voted_for_v1,
        timesVotedAgainstV1: row.times_voted_against_v1,
        timesSkippedV1: row.times_skipped_v1,
        timesSeenV2: row.times_seen_v2,
        timesVotedForV2: row.times_voted_for_v2,
        timesVotedAgainstV2: row.times_voted_against_v2,
        timesSkippedV2: row.times_skipped_v2,
        timesSeenV3: row.times_seen_v3,
        timesVotedForV3: row.times_voted_for_v3,
        timesVotedAgainstV3: row.times_voted_against_v3,
        timesSkippedV3: row.times_skipped_v3,
        timesSeenV4: row.times_seen_v4,
        timesVotedForV4: row.times_voted_for_v4,
        timesVotedAgainstV4: row.times_voted_against_v4,
        timesSkippedV4: row.times_skipped_v4,
        timesSeenV5: row.times_seen_v5,
        timesVotedForV5: row.times_voted_for_v5,
        timesVotedAgainstV5: row.times_voted_against_v5,
        timesSkippedV5: row.times_skipped_v5,
        lastUpdatedAt: row.last_updated_at,
    }))
}

// ============================================================================
// VALIDATION RUNS LIST
// ============================================================================

export async function getValidationRuns(db: D1Database, limit = 20): Promise<ValidationRunIndex[]> {
    const result = await db
        .prepare(
            `SELECT * FROM voting_validation_runs ORDER BY started_at DESC LIMIT ?`,
        )
        .bind(limit)
        .all<{
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
        }>()

    return (result.results ?? []).map((row) => ({
        partitionKey: 'validation' as const,
        rowKey: `run_${row.run_id}`,
        runId: row.run_id,
        year: row.year,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? undefined,
        lastUpdatedAt: row.last_updated_at,
        totalSessions: row.total_sessions,
        processedSessions: row.processed_sessions,
        processedRounds: row.processed_rounds,
        processedVotes: row.processed_votes,
    }))
}

export async function getValidationRunById(db: D1Database, runId: string): Promise<ValidationRunIndex | null> {
    const row = await db
        .prepare(`SELECT * FROM voting_validation_runs WHERE run_id = ?`)
        .bind(runId)
        .first<{
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
        }>()

    if (!row) return null

    return {
        partitionKey: 'validation' as const,
        rowKey: `run_${row.run_id}`,
        runId: row.run_id,
        year: row.year,
        status: row.status,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? undefined,
        lastUpdatedAt: row.last_updated_at,
        totalSessions: row.total_sessions,
        processedSessions: row.processed_sessions,
        processedRounds: row.processed_rounds,
        processedVotes: row.processed_votes,
    }
}

// ============================================================================
// FAIRNESS METRICS
// ============================================================================

export async function calculateAndSaveFairnessMetrics(
    db: D1Database,
    runId: string,
    stats: Map<string, TalkStatsAccumulator>,
): Promise<void> {
    const versions: Array<'aggregated' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5'> = [
        'aggregated',
        'v1',
        'v2',
        'v3',
        'v4',
        'v5',
    ]

    for (const version of versions) {
        const appearances: number[] = []

        for (const [, talkStats] of stats) {
            let timesSeen = 0

            switch (version) {
                case 'aggregated':
                    timesSeen = talkStats.timesSeenAggregated
                    break
                case 'v1':
                    timesSeen = talkStats.timesSeenV1
                    break
                case 'v2':
                    timesSeen = talkStats.timesSeenV2
                    break
                case 'v3':
                    timesSeen = talkStats.timesSeenV3
                    break
                case 'v4':
                    timesSeen = talkStats.timesSeenV4
                    break
                case 'v5':
                    timesSeen = talkStats.timesSeenV5
                    break
            }

            if (timesSeen > 0) {
                appearances.push(timesSeen)
            }
        }

        if (appearances.length > 0) {
            const metrics = calculateFairnessMetrics(appearances)
            const now = new Date().toISOString()

            await db
                .prepare(
                    `INSERT INTO fairness_metrics (run_id, version, metrics_json, last_updated_at)
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT(run_id, version) DO UPDATE SET
                         metrics_json = excluded.metrics_json,
                         last_updated_at = excluded.last_updated_at`,
                )
                .bind(runId, version, JSON.stringify(metrics), now)
                .run()
        }
    }
}

export async function getFairnessMetrics(db: D1Database, runId: string): Promise<Record<string, FairnessMetrics>> {
    const result = await db
        .prepare(`SELECT version, metrics_json FROM fairness_metrics WHERE run_id = ?`)
        .bind(runId)
        .all<{ version: string; metrics_json: string }>()

    const metrics: Record<string, FairnessMetrics> = {}
    for (const row of result.results ?? []) {
        try {
            metrics[row.version] = JSON.parse(row.metrics_json)
        } catch (error) {
            console.error(`Failed to parse metrics for version ${row.version}:`, error)
        }
    }

    return metrics
}

// ============================================================================
// TALK RESULTS (ELO rankings)
// ============================================================================

export async function saveTalkResults(db: D1Database, runId: string, results: EloResultImport[]): Promise<void> {
    const timestamp = new Date().toISOString()

    // Ensure results are sorted by rank
    results.sort((a, b) => a.rank - b.rank)

    const talkResults: TalkResult[] = results.map((result, index) => ({
        partitionKey: `talk_result_${runId}` as const,
        rowKey: index.toString().padStart(4, '0'),
        runId,
        talkId: result.id,
        rank: result.rank,
        wins: result.wins,
        totalVotes: result.totalVotes,
        losses: result.losses,
        winPct: result.winPct,
        lossPct: result.lossPct,
        uploadedAt: timestamp,
    }))

    // Save in batches of 20
    const batchSize = 20
    for (let i = 0; i < talkResults.length; i += batchSize) {
        const batch = talkResults.slice(i, i + batchSize)
        const statements = batch.map((r) =>
            db
                .prepare(
                    `INSERT INTO talk_results (run_id, talk_id, rank, wins, losses, total_votes, win_pct, loss_pct, uploaded_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT(run_id, talk_id) DO UPDATE SET
                         rank = excluded.rank,
                         wins = excluded.wins,
                         losses = excluded.losses,
                         total_votes = excluded.total_votes,
                         win_pct = excluded.win_pct,
                         loss_pct = excluded.loss_pct,
                         uploaded_at = excluded.uploaded_at`,
                )
                .bind(r.runId, r.talkId, r.rank, r.wins, r.losses, r.totalVotes, r.winPct, r.lossPct, r.uploadedAt),
        )
        await db.batch(statements)
    }
}

export async function getTalkResults(db: D1Database, runId: string): Promise<TalkResult[]> {
    const result = await db
        .prepare(`SELECT * FROM talk_results WHERE run_id = ? ORDER BY rank`)
        .bind(runId)
        .all<{
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
        }>()

    return (result.results ?? []).map((row) => ({
        partitionKey: `talk_result_${row.run_id}` as const,
        rowKey: row.rank.toString().padStart(4, '0'),
        runId: row.run_id,
        talkId: row.talk_id,
        rank: row.rank,
        wins: row.wins,
        losses: row.losses,
        totalVotes: row.total_votes,
        winPct: row.win_pct ?? 0,
        lossPct: row.loss_pct ?? 0,
        uploadedAt: row.uploaded_at,
    }))
}

// ============================================================================
// UNDERREPRESENTED GROUPS CONFIG
// ============================================================================

export async function getUnderrepresentedGroupsConfig(db: D1Database): Promise<string[]> {
    try {
        const row = await db
            .prepare(`SELECT selected_groups_json FROM underrepresented_groups_config WHERE id = 'config'`)
            .first<{ selected_groups_json: string }>()

        if (!row) return []
        return JSON.parse(row.selected_groups_json)
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

export async function saveUnderrepresentedGroupsConfig(
    db: D1Database,
    year: string,
    selectedGroups: string[],
): Promise<void> {
    try {
        const now = new Date().toISOString()
        await db
            .prepare(
                `INSERT INTO underrepresented_groups_config (id, selected_groups_json, last_updated_at, last_updated_year)
                 VALUES ('config', ?, ?, ?)
                 ON CONFLICT(id) DO UPDATE SET
                     selected_groups_json = excluded.selected_groups_json,
                     last_updated_at = excluded.last_updated_at,
                     last_updated_year = excluded.last_updated_year`,
            )
            .bind(JSON.stringify(selectedGroups.sort()), now, year)
            .run()
    } catch (error: any) {
        recordException(error)
        throw error
    }
}

// ============================================================================
// MAIN VALIDATION PROCESS
// ============================================================================

export async function runVotingValidation(db: D1Database, year: string, talks: TalkVotingData[]): Promise<string> {
    const runId = crypto.randomUUID()
    let processedSessions = 0
    let processedRounds = 0
    let processedVotes = 0

    try {
        // Get all voting sessions from D1
        const sessionRows = await listVotingSessions(db, year, CURRENT_SESSION_VERSION)
        const sessions = sessionRows.map(rowToVotingSession)

        // Create run index
        await createValidationRunIndex(db, runId, year, sessions.length)

        // Process sessions
        const globalStats = new Map<string, TalkStatsAccumulator>()

        // Initialize global stats
        talks.forEach((talk) => {
            globalStats.set(talk.id, {
                talkId: talk.id,
                title: talk.title,
                timesSeenAggregated: 0,
                timesVotedForAggregated: 0,
                timesVotedAgainstAggregated: 0,
                timesSkippedAggregated: 0,
                timesSeenV1: 0,
                timesVotedForV1: 0,
                timesVotedAgainstV1: 0,
                timesSkippedV1: 0,
                timesSeenV2: 0,
                timesVotedForV2: 0,
                timesVotedAgainstV2: 0,
                timesSkippedV2: 0,
                timesSeenV3: 0,
                timesVotedForV3: 0,
                timesVotedAgainstV3: 0,
                timesSkippedV3: 0,
                timesSeenV4: 0,
                timesVotedForV4: 0,
                timesVotedAgainstV4: 0,
                timesSkippedV4: 0,
                timesSeenV5: 0,
                timesVotedForV5: 0,
                timesVotedAgainstV5: 0,
                timesSkippedV5: 0,
            })
        })

        try {
            for (const session of sessions) {
                const sessionStats = await processVotingSession(db, runId, session, talks)

                // Merge session stats into global stats
                for (const [talkId, sessionStat] of sessionStats.talkStats) {
                    const globalStat = globalStats.get(talkId)
                    if (globalStat) {
                        globalStat.timesSeenAggregated += sessionStat.timesSeenAggregated
                        globalStat.timesVotedForAggregated += sessionStat.timesVotedForAggregated
                        globalStat.timesVotedAgainstAggregated += sessionStat.timesVotedAgainstAggregated
                        globalStat.timesSkippedAggregated += sessionStat.timesSkippedAggregated
                        globalStat.timesSeenV1 += sessionStat.timesSeenV1
                        globalStat.timesVotedForV1 += sessionStat.timesVotedForV1
                        globalStat.timesVotedAgainstV1 += sessionStat.timesVotedAgainstV1
                        globalStat.timesSkippedV1 += sessionStat.timesSkippedV1
                        globalStat.timesSeenV2 += sessionStat.timesSeenV2
                        globalStat.timesVotedForV2 += sessionStat.timesVotedForV2
                        globalStat.timesVotedAgainstV2 += sessionStat.timesVotedAgainstV2
                        globalStat.timesSkippedV2 += sessionStat.timesSkippedV2
                        globalStat.timesSeenV3 += sessionStat.timesSeenV3
                        globalStat.timesVotedForV3 += sessionStat.timesVotedForV3
                        globalStat.timesVotedAgainstV3 += sessionStat.timesVotedAgainstV3
                        globalStat.timesSkippedV3 += sessionStat.timesSkippedV3
                        globalStat.timesSeenV4 += sessionStat.timesSeenV4
                        globalStat.timesVotedForV4 += sessionStat.timesVotedForV4
                        globalStat.timesVotedAgainstV4 += sessionStat.timesVotedAgainstV4
                        globalStat.timesSkippedV4 += sessionStat.timesSkippedV4
                        globalStat.timesSeenV5 += sessionStat.timesSeenV5
                        globalStat.timesVotedForV5 += sessionStat.timesVotedForV5
                        globalStat.timesVotedAgainstV5 += sessionStat.timesVotedAgainstV5
                        globalStat.timesSkippedV5 += sessionStat.timesSkippedV5
                    }
                }

                processedSessions++
                processedRounds += sessionStats.processedRounds
                processedVotes += sessionStats.processedVotes

                // Update progress every 10 sessions
                if (processedSessions % 10 === 0) {
                    await updateValidationRunProgress(db, runId, processedSessions, processedRounds, processedVotes)
                }

                // Small delay to reduce load on server/table
                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            // Save final statistics
            await saveTalkStatistics(db, runId, globalStats)

            // Calculate and save fairness metrics
            await calculateAndSaveFairnessMetrics(db, runId, globalStats)

            // Mark as completed
            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'completed',
            )
            await markValidationCompleted(db, runId)

            return runId
        } catch (error) {
            // Mark as incomplete on error
            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'incomplete',
            )
            await markValidationCompleted(db, runId)
            recordException(error)
            throw error
        }
    } catch (error) {
        // Mark as incomplete on error for outer try block
        try {
            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'incomplete',
            )
            await markValidationCompleted(db, runId)
        } catch {
            // Ignore errors in cleanup
        }
        recordException(error)
        throw error
    }
}
