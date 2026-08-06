import {
    createVotingSession as d1CreateVotingSession,
    getSessionCounter as d1GetSessionCounter,
    getVotesForSession as d1GetVotesForSession,
    getVotingSessionById as d1GetVotingSessionById,
    incrementSessionCounter as d1IncrementSessionCounter,
    listVotingSessions as d1ListVotingSessions,
    recordVote as d1RecordVote,
    updateVotingSessionIndex as d1UpdateVotingSessionIndex,
} from '../../d1.server'
import {
    canStartValidation as d1CanStartValidation,
    calculateAndSaveFairnessMetrics,
    computeTalkStatsFromVoteResults,
    createValidationRunIndex,
    getFairnessMetrics as d1GetFairnessMetrics,
    getTalkResults as d1GetTalkResults,
    getTalkStatistics as d1GetTalkStatistics,
    getUnderrepresentedGroupsConfig as d1GetUnderrepresentedGroupsConfig,
    getValidationRunById as d1GetValidationRunById,
    getValidationRuns as d1GetValidationRuns,
    getVoteResults as d1GetVoteResults,
    markValidationCompleted as d1MarkValidationCompleted,
    markValidationStarted as d1MarkValidationStarted,
    processVotingSession,
    saveTalkResults as d1SaveTalkResults,
    saveTalkStatistics,
    saveUnderrepresentedGroupsConfig as d1SaveUnderrepresentedGroupsConfig,
    updateValidationRunProgress,
} from '../../voting-validation.server'
import type { ValidationChunkResult } from '../../voting-validation-types'
import type { TalkVotingData, VoteRecord, VotingSession } from '../../voting-types'
import { CURRENT_SESSION_VERSION } from '../../voting-version-constants'
import type { VotingStore } from '../voting-store'
import { rowToVoteRecord, rowToVotingSession } from './row-converters.server'

export function createD1VotingStore(db: D1Database): VotingStore {
    return {
        async incrementSessionCounter(year) {
            return d1IncrementSessionCounter(db, year)
        },

        async getSessionCounter(year) {
            return d1GetSessionCounter(db, year)
        },

        async getVotingSession(sessionId) {
            const row = await d1GetVotingSessionById(db, sessionId)
            return row ? rowToVotingSession(row) : null
        },

        async createVotingSession(session) {
            const now = new Date().toISOString()
            await d1CreateVotingSession(db, {
                session_id: session.sessionId,
                year: session.year,
                seed: session.seed,
                total_pairs: session.totalPairs,
                input_sessionize_talk_ids_json: session.inputSessionizeTalkIdsJson,
                current_index: session.currentIndex,
                version: session.version,
                round_number: session.roundNumber,
                max_pairs_per_round: session.maxPairsPerRound,
                created_at: session.createdAt,
                updated_at: now,
            })
        },

        async listVotingSessions(year, version) {
            const rows = await d1ListVotingSessions(db, year, version)
            return rows.map(rowToVotingSession)
        },

        async recordVote({ sessionId, year, roundNumber, indexInRound, vote }) {
            await d1RecordVote(db, sessionId, year, roundNumber, indexInRound, vote)
            await updateSessionIndexSafely(db, sessionId, roundNumber, indexInRound + 1)
        },

        async getVotesForSession(sessionId) {
            const rows = await d1GetVotesForSession(db, sessionId)
            return rows.map(rowToVoteRecord)
        },

        async canStartValidation() {
            return d1CanStartValidation(db)
        },

        async getValidationRunStatus() {
            const row = await db
                .prepare(`SELECT is_running, current_run_id FROM voting_validation_globals WHERE id = 'global'`)
                .first<{ is_running: number; current_run_id: string | null }>()

            if (!row) {
                return { isRunning: false }
            }

            return {
                isRunning: !!row.is_running,
                currentRunId: row.current_run_id ?? undefined,
            }
        },

        async getValidationRuns(limit) {
            return d1GetValidationRuns(db, limit)
        },

        async getValidationRunById(runId) {
            return d1GetValidationRunById(db, runId)
        },

        async startValidationRun(runId, year) {
            return startD1ValidationRun(db, runId, year)
        },

        async processValidationChunk(runId, year, talks, chunkSize) {
            return processD1ValidationChunk(db, runId, year, talks, chunkSize)
        },

        async getTalkStatistics(runId) {
            return d1GetTalkStatistics(db, runId)
        },

        async getFairnessMetrics(runId) {
            return d1GetFairnessMetrics(db, runId)
        },

        async getVoteResults(runId) {
            return d1GetVoteResults(db, runId)
        },

        async getTalkResults(runId) {
            return d1GetTalkResults(db, runId)
        },

        async saveTalkResults(runId, results) {
            await d1SaveTalkResults(db, runId, results)
        },

        async getUnderrepresentedGroupsConfig() {
            return d1GetUnderrepresentedGroupsConfig(db)
        },

        async saveUnderrepresentedGroupsConfig(year, selectedGroups) {
            await d1SaveUnderrepresentedGroupsConfig(db, year, selectedGroups)
        },
    }
}

/**
 * Safely advances a session's currentIndex/round.
 * Only moves forward — stale votes for earlier rounds are ignored.
 */
async function updateSessionIndexSafely(
    db: D1Database,
    sessionId: string,
    voteRoundNumber: number,
    newCurrentIndex: number,
): Promise<void> {
    try {
        const session = await d1GetVotingSessionById(db, sessionId)

        if (!session) {
            console.warn(`Session not found: ${sessionId}`)
            return
        }

        if (session.version !== CURRENT_SESSION_VERSION) {
            throw new Error(`Cannot update session index for non-V${CURRENT_SESSION_VERSION} session`)
        }

        const currentRoundNumber = session.round_number
        const currentIndex = session.current_index

        if (voteRoundNumber === currentRoundNumber) {
            if (newCurrentIndex > currentIndex) {
                await d1UpdateVotingSessionIndex(db, sessionId, newCurrentIndex)
            }
        } else if (voteRoundNumber > currentRoundNumber) {
            await d1UpdateVotingSessionIndex(db, sessionId, newCurrentIndex, voteRoundNumber)
        }
    } catch (error) {
        console.error(`Error updating session index for ${sessionId}:`, error)
    }
}

/**
 * Starts a validation run: takes the global lock and creates the run row.
 * No sessions are processed here — processing happens in subsequent
 * processValidationChunk calls driven by the admin UI, because a Workers
 * request can't run long enough to process every session in one invocation.
 */
async function startD1ValidationRun(
    db: D1Database,
    runId: string,
    year: string,
): Promise<{ totalSessions: number }> {
    // Any run still marked running has lost its driver — canStartValidation
    // vetoed genuinely-active runs before we got here — so record it honestly
    // rather than leaving a permanent 'running' row.
    const now = new Date().toISOString()
    await db
        .prepare(`UPDATE voting_validation_runs SET status = 'incomplete', last_updated_at = ? WHERE status = 'running'`)
        .bind(now)
        .run()

    const sessionRows = await d1ListVotingSessions(db, year, CURRENT_SESSION_VERSION)
    await d1MarkValidationStarted(db, runId)
    await createValidationRunIndex(db, runId, year, sessionRows.length)

    return { totalSessions: sessionRows.length }
}

/**
 * Processes the next chunk of sessions for a run, resuming from the cursor
 * persisted in the run row (processed_sessions). The final chunk recomputes
 * talk statistics from vote_results, so retried or concurrently-driven chunks
 * can never double-count. Errors are left to propagate: the run stays
 * 'running' and a later chunk call resumes from the last persisted cursor.
 */
async function processD1ValidationChunk(
    db: D1Database,
    runId: string,
    year: string,
    talks: TalkVotingData[],
    chunkSize: number,
): Promise<ValidationChunkResult> {
    const run = await d1GetValidationRunById(db, runId)
    if (!run) {
        throw new Error(`Validation run ${runId} not found`)
    }
    if (run.status !== 'running') {
        return { done: true, processedSessions: run.processedSessions, totalSessions: run.totalSessions }
    }

    const sessionRows = await d1ListVotingSessions(db, year, CURRENT_SESSION_VERSION)
    const sessions = sessionRows.map(rowToVotingSession)

    const cursor = Math.min(run.processedSessions, sessions.length)
    const slice = sessions.slice(cursor, cursor + chunkSize)

    let processedRounds = run.processedRounds
    let processedVotes = run.processedVotes
    for (const session of slice) {
        const result = await processVotingSession(db, runId, session, talks)
        processedRounds += result.processedRounds
        processedVotes += result.processedVotes
    }

    const processedSessions = cursor + slice.length
    const done = processedSessions >= sessions.length

    if (done) {
        const stats = await computeTalkStatsFromVoteResults(db, runId, talks)
        await saveTalkStatistics(db, runId, stats)
        await calculateAndSaveFairnessMetrics(db, runId, stats)
        await updateValidationRunProgress(db, runId, processedSessions, processedRounds, processedVotes, 'completed')
        await d1MarkValidationCompleted(db, runId)
    } else {
        await updateValidationRunProgress(db, runId, processedSessions, processedRounds, processedVotes)
    }

    return { done, processedSessions, totalSessions: sessions.length }
}

// Re-exported for caller convenience (kept here to avoid public surface noise)
export type { VoteRecord, VotingSession }
