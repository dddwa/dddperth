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
import { recordException } from '../../record-exception'
import {
    canStartValidation as d1CanStartValidation,
    calculateAndSaveFairnessMetrics,
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
import type { TalkStatsAccumulator } from '../../voting-validation-types'
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

        async markValidationStarted(runId) {
            await d1MarkValidationStarted(db, runId)
        },

        async markValidationCompleted(runId) {
            await d1MarkValidationCompleted(db, runId)
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

        async runValidation(year, talks) {
            return runD1Validation(db, year, talks)
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
 * Runs the full voting validation pass. Mostly delegates to the existing
 * voting-validation.server.ts helpers but owns the orchestration so the
 * store interface stays clean.
 */
async function runD1Validation(db: D1Database, year: string, talks: TalkVotingData[]): Promise<string> {
    const runId = crypto.randomUUID()
    let processedSessions = 0
    let processedRounds = 0
    let processedVotes = 0

    try {
        const sessionRows = await d1ListVotingSessions(db, year, CURRENT_SESSION_VERSION)
        const sessions = sessionRows.map(rowToVotingSession)

        await createValidationRunIndex(db, runId, year, sessions.length)

        const globalStats = new Map<string, TalkStatsAccumulator>()
        talks.forEach((talk) => {
            globalStats.set(talk.id, blankAccumulator(talk.id, talk.title))
        })

        try {
            for (const session of sessions) {
                const sessionStats = await processVotingSession(db, runId, session, talks)

                for (const [talkId, sessionStat] of sessionStats.talkStats) {
                    const globalStat = globalStats.get(talkId)
                    if (globalStat) {
                        mergeStats(globalStat, sessionStat)
                    }
                }

                processedSessions++
                processedRounds += sessionStats.processedRounds
                processedVotes += sessionStats.processedVotes

                if (processedSessions % 10 === 0) {
                    await updateValidationRunProgress(db, runId, processedSessions, processedRounds, processedVotes)
                }

                await new Promise((resolve) => setTimeout(resolve, 100))
            }

            await saveTalkStatistics(db, runId, globalStats)
            await calculateAndSaveFairnessMetrics(db, runId, globalStats)

            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'completed',
            )
            await d1MarkValidationCompleted(db, runId)

            return runId
        } catch (error) {
            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'incomplete',
            )
            await d1MarkValidationCompleted(db, runId)
            recordException(error)
            throw error
        }
    } catch (error) {
        try {
            await updateValidationRunProgress(
                db,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'incomplete',
            )
            await d1MarkValidationCompleted(db, runId)
        } catch {
            // Ignore cleanup errors
        }
        recordException(error)
        throw error
    }
}

function blankAccumulator(talkId: string, title: string): TalkStatsAccumulator {
    return {
        talkId,
        title,
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
    }
}

function mergeStats(target: TalkStatsAccumulator, source: TalkStatsAccumulator) {
    target.timesSeenAggregated += source.timesSeenAggregated
    target.timesVotedForAggregated += source.timesVotedForAggregated
    target.timesVotedAgainstAggregated += source.timesVotedAgainstAggregated
    target.timesSkippedAggregated += source.timesSkippedAggregated
    target.timesSeenV1 += source.timesSeenV1
    target.timesVotedForV1 += source.timesVotedForV1
    target.timesVotedAgainstV1 += source.timesVotedAgainstV1
    target.timesSkippedV1 += source.timesSkippedV1
    target.timesSeenV2 += source.timesSeenV2
    target.timesVotedForV2 += source.timesVotedForV2
    target.timesVotedAgainstV2 += source.timesVotedAgainstV2
    target.timesSkippedV2 += source.timesSkippedV2
    target.timesSeenV3 += source.timesSeenV3
    target.timesVotedForV3 += source.timesVotedForV3
    target.timesVotedAgainstV3 += source.timesVotedAgainstV3
    target.timesSkippedV3 += source.timesSkippedV3
    target.timesSeenV4 += source.timesSeenV4
    target.timesVotedForV4 += source.timesVotedForV4
    target.timesVotedAgainstV4 += source.timesVotedAgainstV4
    target.timesSkippedV4 += source.timesSkippedV4
    target.timesSeenV5 += source.timesSeenV5
    target.timesVotedForV5 += source.timesVotedForV5
    target.timesVotedAgainstV5 += source.timesVotedAgainstV5
    target.timesSkippedV5 += source.timesSkippedV5
}

// Re-exported for caller convenience (kept here to avoid public surface noise)
export type { VoteRecord, VotingSession }
