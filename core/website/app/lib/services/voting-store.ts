import type {
    EloResultImport,
    FairnessMetrics,
    TalkResult,
    TalkStatistics,
    ValidationChunkResult,
    ValidationRunIndex,
    VoteResult,
} from '../voting-validation-types'
import type { TalkVotingData, VoteRecord, VotingSession } from '../voting-types'

/**
 * Persistence boundary for voting data — sessions, votes, and validation
 * runs. Domain-shaped on purpose: implementations are free to use SQL,
 * KV, or anything else, but the interface stays in the language of voting.
 */
export interface VotingStore {
    // ---------- Session counters ----------
    incrementSessionCounter(year: string): Promise<number>
    getSessionCounter(year: string): Promise<number>

    // ---------- Voting sessions ----------
    getVotingSession(sessionId: string): Promise<VotingSession | null>
    createVotingSession(session: VotingSession & { year: string }): Promise<void>
    listVotingSessions(year?: string, version?: number): Promise<VotingSession[]>

    // ---------- Votes ----------
    recordVote(args: {
        sessionId: string
        year: string
        roundNumber: number
        indexInRound: number
        vote: 'A' | 'B' | 'S'
    }): Promise<void>
    getVotesForSession(sessionId: string): Promise<VoteRecord[]>

    // ---------- Validation lifecycle ----------
    canStartValidation(): Promise<{ canStart: boolean; reason?: string; currentRunId?: string }>

    // ---------- Validation runs ----------
    getValidationRunStatus(): Promise<{ isRunning: boolean; currentRunId?: string }>
    getValidationRuns(limit?: number): Promise<ValidationRunIndex[]>
    getValidationRunById(runId: string): Promise<ValidationRunIndex | null>

    // ---------- Validation execution ----------
    // Validation is processed in resumable chunks driven by the admin UI: a
    // Workers request can't outlive its response long enough to process every
    // session in one go (ctx.waitUntil is capped ~30s), so each chunk call
    // advances the run's cursor and the final chunk computes the statistics.
    startValidationRun(runId: string, year: string): Promise<{ totalSessions: number }>
    processValidationChunk(
        runId: string,
        year: string,
        talks: TalkVotingData[],
        chunkSize: number,
    ): Promise<ValidationChunkResult>

    // ---------- Validation results ----------
    getTalkStatistics(runId: string): Promise<TalkStatistics[]>
    getFairnessMetrics(runId: string): Promise<Record<string, FairnessMetrics>>
    getVoteResults(runId: string): Promise<VoteResult[]>
    getTalkResults(runId: string): Promise<TalkResult[]>
    saveTalkResults(runId: string, results: EloResultImport[]): Promise<void>

    // ---------- Underrepresented groups config ----------
    getUnderrepresentedGroupsConfig(): Promise<string[]>
    saveUnderrepresentedGroupsConfig(year: string, selectedGroups: string[]): Promise<void>
}
