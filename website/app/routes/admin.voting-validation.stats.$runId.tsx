import { DateTime } from 'luxon'
import { useState } from 'react'
import { useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import type { TalkStatisticsWithDetailsResponse, ValidationRunIndex } from '~/lib/voting-validation-types'
import { getFairnessMetrics, getTalkStatistics } from '~/lib/voting-validation.server'
import { ensureVotesTableExists } from '~/lib/voting.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.voting-validation.stats.$runId'

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const { runId } = params
    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    // Ensure the votes table exists
    const tableClient = await ensureVotesTableExists(context.tableServiceClient, context.getTableClient, year)

    // Get validation run details
    let runDetails = null
    try {
        const partitionKey: ValidationRunIndex['partitionKey'] = 'validation'
        const rowKey: ValidationRunIndex['rowKey'] = `run_${runId}`
        const runEntity: ValidationRunIndex = await tableClient.getEntity(partitionKey, rowKey)
        runDetails = {
            startedAt: runEntity.startedAt,
            completedAt: runEntity.completedAt,
            status: runEntity.status,
            totalSessions: runEntity.totalSessions,
            processedSessions: runEntity.processedSessions,
            processedVotes: runEntity.processedVotes,
            totalRounds: runEntity.processedRounds,
        }
    } catch (error: any) {
        if (error.statusCode !== 404) {
            console.error('Error getting run details:', error)
        }
    }

    // Get talk statistics for this run
    const stats = await getTalkStatistics(tableClient, runId)

    // Get fairness metrics
    const fairnessMetricsMap = await getFairnessMetrics(tableClient, runId)
    const fairnessMetrics: TalkStatisticsWithDetailsResponse['fairnessMetrics'] = {
        aggregated: fairnessMetricsMap.aggregated,
        v1: fairnessMetricsMap.v1,
        v2: fairnessMetricsMap.v2,
        v3: fairnessMetricsMap.v3,
        v4: fairnessMetricsMap.v4,
    }

    // Convert to response format
    const talks = stats.map((stat) => ({
        talkId: stat.talkId,
        title: stat.title,
        stats: {
            aggregated: {
                timesSeen: stat.timesSeenAggregated,
                votedFor: stat.timesVotedForAggregated,
                votedAgainst: stat.timesVotedAgainstAggregated,
                skipped: stat.timesSkippedAggregated,
                winRate:
                    stat.timesVotedForAggregated + stat.timesVotedAgainstAggregated > 0
                        ? (stat.timesVotedForAggregated /
                              (stat.timesVotedForAggregated + stat.timesVotedAgainstAggregated)) *
                          100
                        : 0,
            },
            v1: {
                timesSeen: stat.timesSeenV1,
                votedFor: stat.timesVotedForV1,
                votedAgainst: stat.timesVotedAgainstV1,
                skipped: stat.timesSkippedV1,
                winRate:
                    stat.timesVotedForV1 + stat.timesVotedAgainstV1 > 0
                        ? (stat.timesVotedForV1 / (stat.timesVotedForV1 + stat.timesVotedAgainstV1)) * 100
                        : 0,
            },
            v2: {
                timesSeen: stat.timesSeenV2,
                votedFor: stat.timesVotedForV2,
                votedAgainst: stat.timesVotedAgainstV2,
                skipped: stat.timesSkippedV2,
                winRate:
                    stat.timesVotedForV2 + stat.timesVotedAgainstV2 > 0
                        ? (stat.timesVotedForV2 / (stat.timesVotedForV2 + stat.timesVotedAgainstV2)) * 100
                        : 0,
            },
            v3: {
                timesSeen: stat.timesSeenV3,
                votedFor: stat.timesVotedForV3,
                votedAgainst: stat.timesVotedAgainstV3,
                skipped: stat.timesSkippedV3,
                winRate:
                    stat.timesVotedForV3 + stat.timesVotedAgainstV3 > 0
                        ? (stat.timesVotedForV3 / (stat.timesVotedForV3 + stat.timesVotedAgainstV3)) * 100
                        : 0,
            },
            v4: {
                timesSeen: stat.timesSeenV4,
                votedFor: stat.timesVotedForV4,
                votedAgainst: stat.timesVotedAgainstV4,
                skipped: stat.timesSkippedV4,
                winRate:
                    stat.timesVotedForV4 + stat.timesVotedAgainstV4 > 0
                        ? (stat.timesVotedForV4 / (stat.timesVotedForV4 + stat.timesVotedAgainstV4)) * 100
                        : 0,
            },
        },
    }))

    // Sort by aggregated win rate descending
    talks.sort((a, b) => b.stats.aggregated.winRate - a.stats.aggregated.winRate)

    const response: TalkStatisticsWithDetailsResponse = {
        runId,
        talks,
        runDetails,
        fairnessMetrics,
    }

    return response
}

type SortField = 'title' | 'seen' | 'win'
type SortDirection = 'asc' | 'desc'
type VersionFilter = 'aggregated' | 'v1' | 'v2' | 'v3' | 'v4'

export default function VotingValidationStats() {
    const { runId, talks, runDetails, fairnessMetrics } = useLoaderData<typeof loader>()
    const [sortField, setSortField] = useState<SortField>('win')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [versionFilter, setVersionFilter] = useState<VersionFilter>('aggregated')

    // Get stats for the selected version
    const getStatsForVersion = (talk: (typeof talks)[0]) => {
        switch (versionFilter) {
            case 'aggregated':
                return talk.stats.aggregated
            case 'v1':
                return talk.stats.v1
            case 'v2':
                return talk.stats.v2
            case 'v3':
                return talk.stats.v3
            case 'v4':
                return talk.stats.v4
        }
    }

    // Sort talks based on current sort field and direction
    const sortedTalks = [...talks].sort((a, b) => {
        let valueA: number | string
        let valueB: number | string

        switch (sortField) {
            case 'title':
                valueA = a.title.toLowerCase()
                valueB = b.title.toLowerCase()
                break
            case 'seen':
                valueA = getStatsForVersion(a).timesSeen
                valueB = getStatsForVersion(b).timesSeen
                break
            case 'win':
                valueA = getStatsForVersion(a).winRate
                valueB = getStatsForVersion(b).winRate
                break
        }

        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
        }

        const numA = valueA as number
        const numB = valueB as number
        return sortDirection === 'asc' ? numA - numB : numB - numA
    })

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('desc')
        }
    }

    // Calculate overall statistics for the selected version
    const versionStats = talks.map(t => getStatsForVersion(t))
    const totalVotesForVersion = versionStats.reduce((sum, stats) => sum + stats.votedFor + stats.votedAgainst + stats.skipped, 0)
    const talksWithVotes = versionStats.filter(stats => stats.timesSeen > 0).length
    
    const overallStats = {
        totalSeen: versionStats.reduce((sum, stats) => sum + stats.timesSeen, 0),
        avgSeen: talks.length > 0 ? versionStats.reduce((sum, stats) => sum + stats.timesSeen, 0) / talks.length : 0,
        minSeen: talks.length > 0 ? Math.min(...versionStats.map(stats => stats.timesSeen)) : 0,
        maxSeen: talks.length > 0 ? Math.max(...versionStats.map(stats => stats.timesSeen)) : 0,
        totalVotesForVersion,
        talksWithVotes,
    }

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return '↕️'
        return sortDirection === 'asc' ? '↑' : '↓'
    }

    return (
        <AdminLayout heading="Voting Validation Statistics">
            <AdminCard mb="6">
                <Flex justifyContent="space-between" alignItems="flex-start" mb="4">
                    <Box>
                        <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                            Validation Run Details
                        </styled.h2>
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Run ID:{' '}
                            <styled.code fontSize="xs" bg="gray.100" px="1" borderRadius="sm">
                                {runId}
                            </styled.code>
                        </styled.p>
                        {runDetails && (
                            <>
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Started:{' '}
                                    {DateTime.fromISO(runDetails.startedAt).toLocaleString(DateTime.DATETIME_SHORT, {
                                        locale: 'en-AU',
                                    })}
                                </styled.p>
                                {runDetails.completedAt && (
                                    <styled.p fontSize="sm" color="gray.600" mb="1">
                                        Completed:{' '}
                                        {DateTime.fromISO(runDetails.completedAt).toLocaleString(
                                            DateTime.DATETIME_SHORT,
                                            { locale: 'en-AU' },
                                        )}
                                    </styled.p>
                                )}
                                <styled.p fontSize="sm" color="gray.600">
                                    Status:{' '}
                                    <styled.span
                                        px="2"
                                        py="1"
                                        borderRadius="full"
                                        fontSize="xs"
                                        fontWeight="medium"
                                        bg={
                                            runDetails.status === 'completed'
                                                ? 'green.100'
                                                : runDetails.status === 'running'
                                                  ? 'blue.100'
                                                  : 'red.100'
                                        }
                                        color={
                                            runDetails.status === 'completed'
                                                ? 'green.800'
                                                : runDetails.status === 'running'
                                                  ? 'blue.800'
                                                  : 'red.800'
                                        }
                                    >
                                        {runDetails.status}
                                    </styled.span>
                                </styled.p>
                                
                                <Flex gap="6" direction={{ base: 'column', md: 'row' }} mt="3">
                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="gray.600" mb="1">
                                            Sessions Processed
                                        </styled.p>
                                        <styled.p fontSize="lg" fontWeight="medium">
                                            {runDetails.processedSessions}/{runDetails.totalSessions}
                                        </styled.p>
                                    </Box>
                                    
                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="gray.600" mb="1">
                                            Total Rounds
                                        </styled.p>
                                        <styled.p fontSize="lg" fontWeight="medium">
                                            {runDetails.totalRounds}
                                        </styled.p>
                                    </Box>
                                    
                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="gray.600" mb="1">
                                            Total Votes
                                        </styled.p>
                                        <styled.p fontSize="lg" fontWeight="medium">
                                            {runDetails.processedVotes}
                                        </styled.p>
                                    </Box>
                                </Flex>
                            </>
                        )}
                    </Box>
                    <AppLink
                        to="/admin/voting"
                        display="inline-block"
                        bg="gray.600"
                        color="white"
                        py="2"
                        px="4"
                        borderRadius="md"
                        textDecoration="none"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{ bg: 'gray.700' }}
                    >
                        ← Back to Voting Admin
                    </AppLink>
                </Flex>
            </AdminCard>

            <AdminCard>
                <Flex justifyContent="space-between" alignItems="center" mb="4">
                    <styled.h2 fontSize="xl" fontWeight="semibold">
                        Talk Statistics
                    </styled.h2>

                    <Box>
                        <styled.label fontSize="sm" color="gray.600" mb="1" display="block">
                            Version Filter
                        </styled.label>
                        <styled.select
                            value={versionFilter}
                            onChange={(e) => setVersionFilter(e.target.value as VersionFilter)}
                            bg="white"
                            border="1px solid"
                            borderColor="gray.300"
                            borderRadius="md"
                            px="3"
                            py="2"
                            fontSize="sm"
                        >
                            <option value="aggregated">Aggregated (All Versions)</option>
                            <option value="v1">V1 Only</option>
                            <option value="v2">V2 Only</option>
                            <option value="v3">V3 Only</option>
                            <option value="v4">V4 Only (Current Algorithm)</option>
                        </styled.select>
                    </Box>
                </Flex>

                {fairnessMetrics[versionFilter] && (
                    <>
                        <styled.h3 fontSize="lg" fontWeight="semibold" mb="3" mt="6">
                            Distribution Metrics ({versionFilter === 'aggregated' ? 'All Versions' : versionFilter.toUpperCase()})
                        </styled.h3>

                        <Flex gap="4" direction={{ base: 'column', sm: 'row' }} flexWrap="wrap" mb="4">
                            <Box flex="1" minW="150px">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Mean Appearances
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].meanAppearances.toFixed(2)}
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="150px">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Standard Deviation
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].standardDeviation.toFixed(2)}
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="150px">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Gini Coefficient
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].giniCoefficient.toFixed(3)}
                                    <styled.span fontSize="sm" color="gray.600" ml="1">
                                        (
                                        {fairnessMetrics[versionFilter].giniCoefficient < 0.2
                                            ? 'Fair'
                                            : fairnessMetrics[versionFilter].giniCoefficient < 0.4
                                              ? 'Moderate'
                                              : 'Unfair'}
                                        )
                                    </styled.span>
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="150px">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    CV (Variation)
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {(fairnessMetrics[versionFilter].coefficientOfVariation * 100).toFixed(1)}%
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="150px">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Distribution
                                </styled.p>
                                <styled.p
                                    fontSize="lg"
                                    fontWeight="medium"
                                    color={fairnessMetrics[versionFilter].isDistributionUniform ? 'green.700' : 'red.700'}
                                >
                                    {fairnessMetrics[versionFilter].isDistributionUniform ? 'Uniform' : 'Non-uniform'}
                                </styled.p>
                            </Box>
                        </Flex>

                        <styled.p fontSize="sm" color="gray.600" mb="6">
                            <strong>Interpretation:</strong> Lower Gini coefficient and CV indicate fairer distribution. A
                            Gini coefficient below 0.2 suggests good fairness, while above 0.4 indicates significant
                            inequality.
                        </styled.p>
                    </>
                )}

                <Flex gap="4" direction={{ base: 'column', sm: 'row' }} flexWrap="wrap" mb="6">
                    <Box flex="1" minW="120px">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Talks with Votes
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.talksWithVotes}/{talks.length}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="120px">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Total Votes
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.totalVotesForVersion.toLocaleString()}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="120px">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Times Seen (Avg)
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.avgSeen.toFixed(1)}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="120px">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Range (Min - Max)
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.minSeen} - {overallStats.maxSeen}
                        </styled.p>
                    </Box>
                </Flex>

                <styled.p fontSize="sm" color="gray.600" mb="2">
                    Click on column headers to sort the data. Use the distribution metrics above to assess voting
                    fairness.
                </styled.p>

                <Box overflowX="auto">
                    <styled.table width="100%" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th textAlign="left" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    <Button
                                        onClick={() => handleSort('title')}
                                        variant="ghost"
                                        size="sm"
                                        cursor="pointer"
                                    >
                                        Talk Title {getSortIcon('title')}
                                    </Button>
                                </styled.th>
                                <styled.th textAlign="center" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    <Button
                                        onClick={() => handleSort('seen')}
                                        variant="ghost"
                                        size="xs"
                                        cursor="pointer"
                                    >
                                        Times Seen {getSortIcon('seen')}
                                    </Button>
                                </styled.th>
                                <styled.th textAlign="center" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    Won
                                </styled.th>
                                <styled.th textAlign="center" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    Lost
                                </styled.th>
                                <styled.th textAlign="center" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    Skipped
                                </styled.th>
                                <styled.th textAlign="center" p="2" borderBottom="2px solid" borderColor="gray.200">
                                    <Button
                                        onClick={() => handleSort('win')}
                                        variant="ghost"
                                        size="xs"
                                        cursor="pointer"
                                    >
                                        Win Rate {getSortIcon('win')}
                                    </Button>
                                </styled.th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedTalks.map((talk) => {
                                const stats = getStatsForVersion(talk)
                                return (
                                    <tr key={talk.talkId}>
                                        <styled.td p="2" borderBottom="1px solid" borderColor="gray.100" maxW="300px">
                                            <styled.div
                                                overflow="hidden"
                                                textOverflow="ellipsis"
                                                whiteSpace="nowrap"
                                                title={talk.title}
                                            >
                                                {talk.title}
                                            </styled.div>
                                        </styled.td>

                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.100"
                                            bg={
                                                runDetails?.totalRounds && stats.timesSeen > runDetails.totalRounds
                                                    ? 'purple.50'
                                                    : stats.timesSeen < overallStats.avgSeen * 0.5
                                                      ? 'red.50'
                                                      : stats.timesSeen > overallStats.avgSeen * 1.5
                                                        ? 'yellow.50'
                                                        : 'transparent'
                                            }
                                        >
                                            {stats.timesSeen}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.100"
                                        >
                                            {stats.votedFor}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.100"
                                        >
                                            {stats.votedAgainst}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.100"
                                        >
                                            {stats.skipped}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.100"
                                        >
                                            <styled.span
                                                fontWeight={stats.winRate > 50 ? 'semibold' : 'normal'}
                                                color={stats.winRate > 50 ? 'green.700' : 'inherit'}
                                            >
                                                {stats.winRate.toFixed(1)}%
                                            </styled.span>
                                        </styled.td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </styled.table>
                </Box>

                {talks.length === 0 && (
                    <styled.p textAlign="center" py="8" color="gray.600">
                        No statistics available for this validation run.
                    </styled.p>
                )}
            </AdminCard>
        </AdminLayout>
    )
}
