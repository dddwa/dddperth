import type { TableClient } from '@azure/data-tables'
import { trace } from '@opentelemetry/api'
import { recordException } from './record-exception'
import { batchReconstructVoteContexts, removeVotesOnDuplicatedTalksInRound } from './voting-reconstruction.server'
import type {
    FairnessMetrics,
    FairnessMetricsRecord,
    TalkStatistics,
    TalkStatsAccumulator,
    ValidationRunIndex,
    VotingValidationGlobal,
} from './voting-validation-types'
import type { TalkVotingData, VoteRecord, VotingSession } from './voting.server'

// Check if validation can be started
export async function canStartValidation(votesTableClient: TableClient): Promise<{
    canStart: boolean
    reason?: string
    currentRunId?: string
}> {
    try {
        const partitionKey: VotingValidationGlobal['partitionKey'] = 'ddd'
        const rowKey: VotingValidationGlobal['rowKey'] = 'voting_validation'
        const globalEntity: VotingValidationGlobal = await votesTableClient.getEntity(partitionKey, rowKey)

        if (!globalEntity.isRunning) {
            return { canStart: true }
        }

        // Check if the current run is stale (hasn't been updated in 30 minutes)
        if (globalEntity.currentRunId && globalEntity.lastStartedAt) {
            const lastUpdate = new Date(globalEntity.lastStartedAt)
            const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000)

            if (lastUpdate < thirtyMinutesAgo) {
                // Check the actual run status
                try {
                    const partitionKey: ValidationRunIndex['partitionKey'] = 'validation'
                    const rowKey: ValidationRunIndex['rowKey'] = `run_${globalEntity.currentRunId}`
                    const runIndex = (await votesTableClient.getEntity(partitionKey, rowKey)) as ValidationRunIndex

                    const runLastUpdate = new Date(runIndex.lastUpdatedAt)
                    if (runLastUpdate < thirtyMinutesAgo && runIndex.status === 'running') {
                        return { canStart: true, reason: 'Previous run appears to be stale' }
                    }
                } catch (error: any) {
                    recordException(error)
                    // Run index not found, can start
                    return { canStart: true, reason: 'Previous run index not found' }
                }
            }
        }

        return {
            canStart: false,
            reason: 'Validation is already running',
            currentRunId: globalEntity.currentRunId,
        }
    } catch (error: any) {
        if (error.statusCode === 404) {
            // Global entity doesn't exist, can start
            return { canStart: true }
        }

        recordException(error)
        throw error
    }
}

// Mark validation as started
export async function markValidationStarted(votesTableClient: TableClient, runId: string): Promise<void> {
    const global: VotingValidationGlobal = {
        partitionKey: 'ddd',
        rowKey: 'voting_validation',
        isRunning: true,
        currentRunId: runId,
        lastStartedAt: new Date().toISOString(),
    }

    await votesTableClient.upsertEntity(global, 'Replace')
}

// Mark validation as completed
export async function markValidationCompleted(votesTableClient: TableClient, runId: string): Promise<void> {
    const global: VotingValidationGlobal = {
        partitionKey: 'ddd',
        rowKey: 'voting_validation',
        isRunning: false,
        lastRunId: runId,
        lastStartedAt: new Date().toISOString(),
    }

    await votesTableClient.upsertEntity(global, 'Replace')
}

// Create validation run index
export async function createValidationRunIndex(
    votesTableClient: TableClient,
    runId: string,
    year: string,
    totalSessions: number,
): Promise<void> {
    const runIndex: ValidationRunIndex = {
        partitionKey: 'validation',
        rowKey: `run_${runId}`,
        runId,
        startedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString(),
        status: 'running',
        totalSessions,
        processedSessions: 0,
        processedRounds: 0,
        processedVotes: 0,
        year,
    }

    await votesTableClient.createEntity(runIndex)
}

// Update validation run progress
export async function updateValidationRunProgress(
    votesTableClient: TableClient,
    runId: string,
    processedSessions: number,
    processedRounds: number,
    processedVotes: number,
    status?: 'running' | 'completed' | 'incomplete',
): Promise<void> {
    const updates: Pick<ValidationRunIndex, 'partitionKey' | 'rowKey'> & Partial<ValidationRunIndex> = {
        partitionKey: 'validation',
        rowKey: `run_${runId}`,
        lastUpdatedAt: new Date().toISOString(),
        processedSessions,
        processedRounds,
        processedVotes,
    }

    if (status === 'completed') {
        updates.completedAt = new Date().toISOString()
        updates.status = status
    } else if (status) {
        updates.status = status
    }

    await votesTableClient.updateEntity(updates, 'Merge')
}

// Process a single voting session
export async function processVotingSession(
    votesTableClient: TableClient,
    runId: string,
    session: VotingSession,
    talks: TalkVotingData[],
): Promise<{
    talkStats: Map<string, TalkStatsAccumulator>
    processedRounds: number
    processedVotes: number
}> {
    return trace.getTracer('default').startActiveSpan('processVotingSession', async (span) => {
        try {
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
                })
            })

            // Get all votes for this session
            const votesQuery = votesTableClient.listEntities<VoteRecord>({
                queryOptions: {
                    filter: `PartitionKey eq 'session_${session.sessionId}'`,
                },
            })

            const sessionTalkIds = JSON.parse(session.inputSessionizeTalkIdsJson) as string[]
            const sessionTalks = talks.filter((t) => sessionTalkIds.includes(t.id))

            let votesProcessed = 0
            let totalRounds = 1

            // Process votes based on session version using efficient batch reconstruction
            try {
                // Collect all votes first for batch processing
                const allVotes: VoteRecord[] = []
                for await (const vote of votesQuery) {
                    allVotes.push(vote)
                }

                // Use efficient batch reconstruction
                const mappedVotes = batchReconstructVoteContexts(allVotes, session, sessionTalks)
                const cleanedVotes = removeVotesOnDuplicatedTalksInRound(mappedVotes)

                // Process each vote using pre-computed contexts
                for (const vote of cleanedVotes) {
                    const leftTalk = vote.pair.left
                    const rightTalk = vote.pair.right

                    const sessionVersion = session.version || 1
                    updateTalkStats(stats, leftTalk.id, rightTalk.id, vote.vote, sessionVersion)
                    votesProcessed++
                    if (vote.roundNumber >= totalRounds) {
                        totalRounds = vote.roundNumber + 1
                    }
                }
            } catch (error: any) {
                // If no votes exist for this session, that's okay, just continue
                if (error.statusCode !== 404) {
                    console.error(`Error processing votes for session ${session.sessionId}:`, error)
                    recordException(error)
                }
            }

            return {
                talkStats: stats,
                processedRounds: totalRounds,
                processedVotes: votesProcessed,
            }
        } finally {
            span.end()
        }
    })
}

// Statistical analysis functions for fairness assessment

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

// Update talk statistics based on vote
function updateTalkStats(
    stats: Map<string, TalkStatsAccumulator>,
    leftTalkId: string,
    rightTalkId: string,
    vote: 'A' | 'B' | 'S',
    sessionVersion: 1 | 2 | 3 | 4,
): void {
    const leftStats = stats.get(leftTalkId)
    const rightStats = stats.get(rightTalkId)

    if (!leftStats || !rightStats) return

    // Update AGGREGATED stats (all versions combined)
    leftStats.timesSeenAggregated++
    rightStats.timesSeenAggregated++

    if (vote === 'A') {
        leftStats.timesVotedForAggregated++
        rightStats.timesVotedAgainstAggregated++
    } else if (vote === 'B') {
        leftStats.timesVotedAgainstAggregated++
        rightStats.timesVotedForAggregated++
    } else {
        leftStats.timesSkippedAggregated++
        rightStats.timesSkippedAggregated++
    }

    // Update specific version stats
    if (sessionVersion === 1) {
        leftStats.timesSeenV1++
        rightStats.timesSeenV1++

        if (vote === 'A') {
            leftStats.timesVotedForV1++
            rightStats.timesVotedAgainstV1++
        } else if (vote === 'B') {
            leftStats.timesVotedAgainstV1++
            rightStats.timesVotedForV1++
        } else {
            leftStats.timesSkippedV1++
            rightStats.timesSkippedV1++
        }
    } else if (sessionVersion === 2) {
        leftStats.timesSeenV2++
        rightStats.timesSeenV2++

        if (vote === 'A') {
            leftStats.timesVotedForV2++
            rightStats.timesVotedAgainstV2++
        } else if (vote === 'B') {
            leftStats.timesVotedAgainstV2++
            rightStats.timesVotedForV2++
        } else {
            leftStats.timesSkippedV2++
            rightStats.timesSkippedV2++
        }
    } else if (sessionVersion === 3) {
        leftStats.timesSeenV3++
        rightStats.timesSeenV3++

        if (vote === 'A') {
            leftStats.timesVotedForV3++
            rightStats.timesVotedAgainstV3++
        } else if (vote === 'B') {
            leftStats.timesVotedAgainstV3++
            rightStats.timesVotedForV3++
        } else {
            leftStats.timesSkippedV3++
            rightStats.timesSkippedV3++
        }
    } else if (sessionVersion === 4) {
        leftStats.timesSeenV4++
        rightStats.timesSeenV4++

        if (vote === 'A') {
            leftStats.timesVotedForV4++
            rightStats.timesVotedAgainstV4++
        } else if (vote === 'B') {
            leftStats.timesVotedAgainstV4++
            rightStats.timesVotedForV4++
        } else {
            leftStats.timesSkippedV4++
            rightStats.timesSkippedV4++
        }
    }
}

// Save accumulated talk statistics
export async function saveTalkStatistics(
    votesTableClient: TableClient,
    runId: string,
    stats: Map<string, TalkStatsAccumulator>,
): Promise<void> {
    return trace.getTracer('default').startActiveSpan('saveTalkStatistics', async (span) => {
        try {
            const timestamp = new Date().toISOString()

            for (const [talkId, accumulator] of stats) {
                const talkStats: TalkStatistics = {
                    partitionKey: 'talk_stats',
                    rowKey: `${runId}_talk_${talkId}`,
                    runId,
                    talkId,
                    title: accumulator.title,
                    timesSeenAggregated: accumulator.timesSeenAggregated,
                    timesVotedForAggregated: accumulator.timesVotedForAggregated,
                    timesVotedAgainstAggregated: accumulator.timesVotedAgainstAggregated,
                    timesSkippedAggregated: accumulator.timesSkippedAggregated,
                    timesSeenV1: accumulator.timesSeenV1,
                    timesVotedForV1: accumulator.timesVotedForV1,
                    timesVotedAgainstV1: accumulator.timesVotedAgainstV1,
                    timesSkippedV1: accumulator.timesSkippedV1,
                    timesSeenV2: accumulator.timesSeenV2,
                    timesVotedForV2: accumulator.timesVotedForV2,
                    timesVotedAgainstV2: accumulator.timesVotedAgainstV2,
                    timesSkippedV2: accumulator.timesSkippedV2,
                    timesSeenV3: accumulator.timesSeenV3,
                    timesVotedForV3: accumulator.timesVotedForV3,
                    timesVotedAgainstV3: accumulator.timesVotedAgainstV3,
                    timesSkippedV3: accumulator.timesSkippedV3,
                    timesSeenV4: accumulator.timesSeenV4,
                    timesVotedForV4: accumulator.timesVotedForV4,
                    timesVotedAgainstV4: accumulator.timesVotedAgainstV4,
                    timesSkippedV4: accumulator.timesSkippedV4,
                    lastUpdatedAt: timestamp,
                }

                await votesTableClient.createEntity(talkStats)
            }
        } finally {
            span.end()
        }
    })
}

// Main validation process
export async function runVotingValidation(
    votesTableClient: TableClient,
    year: string,
    talks: TalkVotingData[],
): Promise<string> {
    return trace.getTracer('default').startActiveSpan('runVotingValidation', { root: true }, async (span) => {
        const runId = crypto.randomUUID()
        let processedSessions = 0
        let processedRounds = 0
        let processedVotes = 0

        try {
            // Get all voting sessions
            const sessionsQuery = votesTableClient.listEntities<VotingSession>({
                queryOptions: {
                    filter: `PartitionKey eq 'session'`,
                },
            })

            const sessions: VotingSession[] = []
            try {
                for await (const session of sessionsQuery) {
                    sessions.push(session)
                }
            } catch (error: any) {
                // If no sessions exist yet, continue with empty array
                if (error.statusCode !== 404) {
                    throw error
                }
            }

            // Create run index
            await createValidationRunIndex(votesTableClient, runId, year, sessions.length)

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
                })
            })

            try {
                for (const session of sessions) {
                    const sessionStats = await processVotingSession(votesTableClient, runId, session, talks)

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
                        }
                    }

                    processedSessions++
                    processedRounds += sessionStats.processedRounds
                    processedVotes += sessionStats.processedVotes

                    // Update progress every 10 sessions
                    await updateValidationRunProgress(
                        votesTableClient,
                        runId,
                        processedSessions,
                        processedRounds,
                        processedVotes,
                    )

                    // Small delay to reduce load on server/table
                    await new Promise((resolve) => setTimeout(resolve, 100))
                }

                // Save final statistics
                await saveTalkStatistics(votesTableClient, runId, globalStats)

                // Calculate and save fairness metrics
                await calculateAndSaveFairnessMetrics(votesTableClient, runId, globalStats)

                // Mark as completed
                await updateValidationRunProgress(
                    votesTableClient,
                    runId,
                    processedSessions,
                    processedRounds,
                    processedVotes,
                    'completed',
                )
                await markValidationCompleted(votesTableClient, runId)

                return runId
            } catch (error) {
                // Mark as incomplete on error
                await updateValidationRunProgress(
                    votesTableClient,
                    runId,
                    processedSessions,
                    processedRounds,
                    processedVotes,
                    'incomplete',
                )
                await markValidationCompleted(votesTableClient, runId)
                recordException(error)
                throw error
            }
        } catch (error) {
            // Mark as incomplete on error for outer try block
            await updateValidationRunProgress(
                votesTableClient,
                runId,
                processedSessions,
                processedRounds,
                processedVotes,
                'incomplete',
            )
            await markValidationCompleted(votesTableClient, runId)
            recordException(error)
            throw error
        } finally {
            span.end()
        }
    })
}

// Calculate and save fairness metrics for all versions
export async function calculateAndSaveFairnessMetrics(
    votesTableClient: TableClient,
    runId: string,
    stats: Map<string, TalkStatsAccumulator>,
): Promise<void> {
    const versions: Array<'aggregated' | 'v1' | 'v2' | 'v3' | 'v4'> = ['aggregated', 'v1', 'v2', 'v3', 'v4']

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
            }

            if (timesSeen > 0) {
                appearances.push(timesSeen)
            }
        }

        if (appearances.length > 0) {
            const metrics = calculateFairnessMetrics(appearances)

            const fairnessRecord: FairnessMetricsRecord = {
                partitionKey: 'fairness_metrics',
                rowKey: `${runId}_${version}`,
                runId,
                version,
                metricsJson: JSON.stringify(metrics),
                lastUpdatedAt: new Date().toISOString(),
            }

            await votesTableClient.createEntity(fairnessRecord)
        }
    }
}

// Get fairness metrics for a run
export async function getFairnessMetrics(
    votesTableClient: TableClient,
    runId: string,
): Promise<Record<string, FairnessMetrics>> {
    try {
        const metricsQuery = votesTableClient.listEntities<FairnessMetricsRecord>({
            queryOptions: {
                filter: `PartitionKey eq 'fairness_metrics' and RowKey ge '${runId}_' and RowKey lt '${runId}~'`,
            },
        })

        const metrics: Record<string, FairnessMetrics> = {}
        for await (const metric of metricsQuery) {
            try {
                metrics[metric.version] = JSON.parse(metric.metricsJson)
            } catch (error) {
                console.error(`Failed to parse metrics for version ${metric.version}:`, error)
            }
        }

        return metrics
    } catch (error: any) {
        if (error.statusCode === 404) {
            return {}
        }
        throw error
    }
}

// Get validation runs list
export async function getValidationRuns(votesTableClient: TableClient, limit = 20): Promise<ValidationRunIndex[]> {
    try {
        const runsQuery = votesTableClient.listEntities<ValidationRunIndex>({
            queryOptions: {
                filter: `PartitionKey eq 'validation'`,
            },
        })

        const runs: ValidationRunIndex[] = []
        for await (const run of runsQuery) {
            runs.push(run)
        }

        // Sort by startedAt descending (newest first)
        runs.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())

        // Return only the requested limit after sorting
        return runs.slice(0, limit)
    } catch (error: any) {
        // If table doesn't exist or no validation entities exist, return empty array
        if (error.statusCode === 404) {
            return []
        }
        throw error
    }
}

// Get talk statistics for a run
export async function getTalkStatistics(votesTableClient: TableClient, runId: string): Promise<TalkStatistics[]> {
    try {
        const statsQuery = votesTableClient.listEntities<TalkStatistics>({
            queryOptions: {
                filter: `PartitionKey eq 'talk_stats' and RowKey ge '${runId}_talk_' and RowKey lt '${runId}_talk~'`,
            },
        })

        const stats: TalkStatistics[] = []
        for await (const stat of statsQuery) {
            stats.push(stat)
        }

        return stats
    } catch (error: any) {
        // If table doesn't exist or no stats exist for this run, return empty array
        if (error.statusCode === 404) {
            return []
        }
        throw error
    }
}
