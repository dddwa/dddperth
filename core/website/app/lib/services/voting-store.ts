import type {
    EloResultImport,
    FairnessMetrics,
    TalkResult,
    TalkStatistics,
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
    markValidationStarted(runId: string): Promise<void>
    markValidationCompleted(runId: string): Promise<void>

    // ---------- Validation runs ----------
    getValidationRunStatus(): Promise<{ isRunning: boolean; currentRunId?: string }>
    getValidationRuns(limit?: number): Promise<ValidationRunIndex[]>
    getValidationRunById(runId: string): Promise<ValidationRunIndex | null>

    // ---------- Validation execution ----------
    runValidation(year: string, talks: TalkVotingData[]): Promise<string>

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
