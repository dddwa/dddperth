export interface ValidationRunIndex {
    partitionKey: 'validation'
    rowKey: `run_${string}` // run_{runId}
    runId: string
    startedAt: string
    completedAt?: string
    lastUpdatedAt: string
    status: 'running' | 'completed' | 'incomplete'
    totalSessions: number
    processedSessions: number
    processedVotes: number
    processedRounds: number
    year: string
}

export interface TalkStatistics {
    partitionKey: 'talk_stats'
    rowKey: `${string}_talk_${string}` // {runId}_talk_{talkId}
    runId: string
    talkId: string
    title: string

    // Aggregated stats (all versions combined with adjustments)
    timesSeenAggregated: number
    timesVotedForAggregated: number
    timesVotedAgainstAggregated: number
    timesSkippedAggregated: number

    // V1 only stats
    timesSeenV1: number
    timesVotedForV1: number
    timesVotedAgainstV1: number
    timesSkippedV1: number

    // V2 only stats
    timesSeenV2: number
    timesVotedForV2: number
    timesVotedAgainstV2: number
    timesSkippedV2: number

    // V3 only stats
    timesSeenV3: number
    timesVotedForV3: number
    timesVotedAgainstV3: number
    timesSkippedV3: number

    // V4 only stats
    timesSeenV4: number
    timesVotedForV4: number
    timesVotedAgainstV4: number
    timesSkippedV4: number

    // ELO ratings (placeholder for future implementation)
    eloRatingAggregated?: number
    eloRatingV1?: number
    eloRatingV2?: number
    eloRatingV3?: number
    eloRatingV4?: number

    lastUpdatedAt: string
}

export interface VotingValidationGlobal {
    partitionKey: 'ddd'
    rowKey: 'voting_validation'
    isRunning: boolean
    currentRunId?: string
    lastRunId?: string
    lastStartedAt?: string
}

// Helper type for tracking talk stats during processing
export interface TalkStatsAccumulator {
    talkId: string
    title: string
    timesSeenAggregated: number
    timesVotedForAggregated: number
    timesVotedAgainstAggregated: number
    timesSkippedAggregated: number
    timesSeenV1: number
    timesVotedForV1: number
    timesVotedAgainstV1: number
    timesSkippedV1: number
    timesSeenV2: number
    timesVotedForV2: number
    timesVotedAgainstV2: number
    timesSkippedV2: number
    timesSeenV3: number
    timesVotedForV3: number
    timesVotedAgainstV3: number
    timesSkippedV3: number
    timesSeenV4: number
    timesVotedForV4: number
    timesVotedAgainstV4: number
    timesSkippedV4: number
}

// Response types for API endpoints
export interface StartValidationResponse {
    success: boolean
    runId?: string
    error?: string
    alreadyRunning?: boolean
}

export interface ValidationRunProgress {
    runId: string
    status: 'running' | 'completed' | 'incomplete'
    startedAt: string
    completedAt?: string
    lastUpdatedAt: string
    totalSessions: number
    processedSessions: number
    percentComplete: number
}

export interface ValidationRunsListResponse {
    runs: ValidationRunProgress[]
    currentRunId?: string
    isRunning: boolean
}

export interface TalkStatisticsResponseVersionStats {
    timesSeen: number
    votedFor: number
    votedAgainst: number
    skipped: number
    winRate: number
}

export interface TalkStatisticsResponse {
    runId: string
    talks: Array<{
        talkId: string
        title: string
        stats: {
            aggregated: TalkStatisticsResponseVersionStats
            v1: TalkStatisticsResponseVersionStats
            v2: TalkStatisticsResponseVersionStats
            v3: TalkStatisticsResponseVersionStats
            v4: TalkStatisticsResponseVersionStats
        }
    }>
}

export interface FairnessMetrics {
    totalTalks: number
    meanAppearances: number
    standardDeviation: number
    coefficientOfVariation: number
    giniCoefficient: number
    minAppearances: number
    maxAppearances: number
    range: number
    isDistributionUniform: boolean
    chiSquareStatistic: number
    pValue: number
}

export interface FairnessMetricsRecord {
    partitionKey: 'fairness_metrics'
    rowKey: `${string}_${string}` // {runId}_{version}
    runId: string
    version: 'aggregated' | 'v1' | 'v2' | 'v3' | 'v4'
    metricsJson: string // JSON stringified FairnessMetrics
    lastUpdatedAt: string
}

export interface ValidationRunDetails {
    startedAt: string
    completedAt?: string
    status: string
    totalSessions: number
    processedSessions: number
    processedVotes: number
    totalRounds: number
}

export interface TalkStatisticsWithDetailsResponse extends TalkStatisticsResponse {
    runDetails: ValidationRunDetails | null
    fairnessMetrics: {
        aggregated?: FairnessMetrics
        v1?: FairnessMetrics
        v2?: FairnessMetrics
        v3?: FairnessMetrics
        v4?: FairnessMetrics
    }
}
