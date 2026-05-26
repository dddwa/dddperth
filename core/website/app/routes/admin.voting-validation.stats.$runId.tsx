import { DateTime } from 'luxon'
import { useState } from 'react'
import { useFetcher, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { conferenceManifest } from '@conference/manifest'
import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getConfSessions, getConfSpeakers, getSpeakerUnderrepresentedGroup } from '~/lib/sessionize.server'
import type {
    EloResultImport,
    TalkResult,
    TalkStatisticsWithDetailsResponse,
} from '~/lib/voting-validation-types'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.voting-validation.stats.$runId'

export async function loader({ request, params, context }: Route.LoaderArgs) {
    await requireAdmin(request, context)

    const { runId } = params
    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    const yearConfig = getYearConfig(year, context.config)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }
    const sessionizeEndpoint = yearConfig.sessions.sessionizeEndpoint

    const voting = context.services.voting

    let runDetails = null
    try {
        const runEntity = await voting.getValidationRunById(runId)
        if (runEntity) {
            runDetails = {
                startedAt: runEntity.startedAt,
                completedAt: runEntity.completedAt,
                status: runEntity.status,
                totalSessions: runEntity.totalSessions,
                processedSessions: runEntity.processedSessions,
                processedVotes: runEntity.processedVotes,
                totalRounds: runEntity.processedRounds,
            }
        }
    } catch (error: any) {
        console.error('Error getting run details:', error)
    }

    const stats = await voting.getTalkStatistics(runId)

    const fairnessMetricsMap = await voting.getFairnessMetrics(runId)
    const fairnessMetrics: TalkStatisticsWithDetailsResponse['fairnessMetrics'] = {
        aggregated: fairnessMetricsMap.aggregated,
        v1: fairnessMetricsMap.v1,
        v2: fairnessMetricsMap.v2,
        v3: fairnessMetricsMap.v3,
        v4: fairnessMetricsMap.v4,
        v5: fairnessMetricsMap.v5,
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
            v5: {
                timesSeen: stat.timesSeenV5,
                votedFor: stat.timesVotedForV5,
                votedAgainst: stat.timesVotedAgainstV5,
                skipped: stat.timesSkippedV5,
                winRate:
                    stat.timesVotedForV5 + stat.timesVotedAgainstV5 > 0
                        ? (stat.timesVotedForV5 / (stat.timesVotedForV5 + stat.timesVotedAgainstV5)) * 100
                        : 0,
            },
        },
    }))

    // Sort by aggregated win rate descending
    talks.sort((a, b) => b.stats.aggregated.winRate - a.stats.aggregated.winRate)

    const talkResults = await voting.getTalkResults(runId)

    type SessionizeTalks = Array<{
        id: string
        title: string
        speakers: {
            id: string
            name: string
        }[]
    }>

    // Get sessionize data if we have results
    let sessionizeTalks: SessionizeTalks | null = null
    let talkToSpeakerIds: Map<string, string[]> = new Map()
    let speakerToUnderrepresented: Map<string, boolean> = new Map()

    if (talkResults.length > 0) {
        const sessions = await getConfSessions({
            sessionizeEndpoint,
        })

        sessionizeTalks = sessions.map((session) => ({
            id: session.id,
            title: session.title,
            speakers: session.speakers,
        }))

        // Get speakers data for underrepresented group checking
        const speakers = await getConfSpeakers({
            sessionizeEndpoint,
        })

        const underrepresentedGroups = await voting.getUnderrepresentedGroupsConfig()

        // Create a map of talk ID to speaker IDs
        sessions.forEach((session) => {
            talkToSpeakerIds.set(
                session.id,
                session.speakers.map((s) => s.id),
            )
        })

        // Create a map of speaker ID to underrepresented status
        const underrepresentedGroupQuestionId = yearConfig.sessions.underrepresentedGroupsQuestionId

        if (underrepresentedGroupQuestionId) {
            speakers.forEach((speaker) => {
                const group = getSpeakerUnderrepresentedGroup(speaker, underrepresentedGroupQuestionId)
                const isUnderrepresented = group ? underrepresentedGroups.includes(group) : false
                speakerToUnderrepresented.set(speaker.id, isUnderrepresented)
            })
        }
    }

    const response: TalkStatisticsWithDetailsResponse & {
        talkResults: TalkResult[]
        sessionizeTalks: SessionizeTalks | null
        talkToSpeakerIds: Record<string, string[]>
        speakerToUnderrepresented: Record<string, boolean>
    } = {
        runId,
        talks,
        runDetails,
        fairnessMetrics,
        talkResults,
        sessionizeTalks,
        talkToSpeakerIds: Object.fromEntries(talkToSpeakerIds),
        speakerToUnderrepresented: Object.fromEntries(speakerToUnderrepresented),
    }

    return response
}

export async function action({ request, params, context }: Route.ActionArgs) {
    await requireAdmin(request, context)

    const { runId } = params
    const voting = context.services.voting

    const formData = await request.formData()
    const intent = formData.get('intent')

    if (intent === 'upload') {
        const file = formData.get('file') as File
        if (!file || file.size === 0) {
            throw new Error('No file uploaded')
        }

        const content = await file.text()
        let results: EloResultImport[]
        try {
            results = JSON.parse(content)
        } catch (error) {
            throw new Error('Invalid JSON format in the uploaded file')
        }

        // Validate the format
        if (!Array.isArray(results) || results.length === 0) {
            throw new Error('Invalid file format: expected an array of results')
        }

        // Validate each result has required fields
        for (const result of results) {
            if (
                typeof result.id !== 'string' ||
                typeof result.rank !== 'number' ||
                typeof result.wins !== 'number' ||
                typeof result.totalVotes !== 'number' ||
                typeof result.losses !== 'number' ||
                typeof result.winPct !== 'number' ||
                typeof result.lossPct !== 'number'
            ) {
                throw new Error(
                    'Invalid result format: missing required fields (id, rank, wins, totalVotes, losses, winPct, lossPct)',
                )
            }
        }

        await voting.saveTalkResults(runId, results)

        return { success: true }
    }

    throw new Error('Invalid intent')
}

type SortField = 'title' | 'seen' | 'win'
type SortDirection = 'asc' | 'desc'
type VersionFilter = 'aggregated' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5'

export default function VotingValidationStats() {
    const { runId, talks, runDetails, fairnessMetrics, talkResults, sessionizeTalks, talkToSpeakerIds, speakerToUnderrepresented } = useLoaderData<typeof loader>()
    const [sortField, setSortField] = useState<SortField>('win')
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
    const [versionFilter, setVersionFilter] = useState<VersionFilter>('aggregated')
    const uploadFetcher = useFetcher()

    // Helper function to check if a talk has speakers from underrepresented groups
    const hasSpeakerFromUnderrepresentedGroup = (talkId: string): boolean => {
        const speakerIds = talkToSpeakerIds[talkId]
        if (!speakerIds) return false
        
        return speakerIds.some(speakerId => speakerToUnderrepresented[speakerId] === true)
    }

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
            case 'v5':
                return talk.stats.v5
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
    const versionStats = talks.map((t) => getStatsForVersion(t))
    const totalVotesForVersion = versionStats.reduce(
        (sum, stats) => sum + stats.votedFor + stats.votedAgainst + stats.skipped,
        0,
    )
    const talksWithVotes = versionStats.filter((stats) => stats.timesSeen > 0).length

    const overallStats = {
        totalSeen: versionStats.reduce((sum, stats) => sum + stats.timesSeen, 0),
        avgSeen: talks.length > 0 ? versionStats.reduce((sum, stats) => sum + stats.timesSeen, 0) / talks.length : 0,
        minSeen: talks.length > 0 ? Math.min(...versionStats.map((stats) => stats.timesSeen)) : 0,
        maxSeen: talks.length > 0 ? Math.max(...versionStats.map((stats) => stats.timesSeen)) : 0,
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
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Run ID:{' '}
                            <styled.code fontSize="xs" bg="admin.100" px="1" borderRadius="sm">
                                {runId}
                            </styled.code>
                        </styled.p>
                        {runDetails && (
                            <>
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Started:{' '}
                                    {DateTime.fromISO(runDetails.startedAt, { zone: conferenceManifest.public.timezone }).toLocaleString(DateTime.DATETIME_SHORT, {
                                        locale: 'en-AU',
                                    })}
                                </styled.p>
                                {runDetails.completedAt && (
                                    <styled.p fontSize="sm" color="admin.600" mb="1">
                                        Completed:{' '}
                                        {DateTime.fromISO(runDetails.completedAt, { zone: conferenceManifest.public.timezone }).toLocaleString(
                                            DateTime.DATETIME_SHORT,
                                            { locale: 'en-AU' },
                                        )}
                                    </styled.p>
                                )}
                                <styled.p fontSize="sm" color="admin.600">
                                    Status:{' '}
                                    <styled.span
                                        px="2"
                                        py="1"
                                        borderRadius="full"
                                        fontSize="xs"
                                        fontWeight="medium"
                                        bg={
                                            runDetails.status === 'completed'
                                                ? 'status.success.bg'
                                                : runDetails.status === 'running'
                                                  ? 'status.info.bg'
                                                  : 'status.danger.bg'
                                        }
                                        color={
                                            runDetails.status === 'completed'
                                                ? 'status.success.fg'
                                                : runDetails.status === 'running'
                                                  ? 'status.info.fg'
                                                  : 'status.danger.fg'
                                        }
                                    >
                                        {runDetails.status}
                                    </styled.span>
                                </styled.p>

                                <Flex gap="6" direction={{ base: 'column', md: 'row' }} mt="3">
                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="admin.600" mb="1">
                                            Sessions Processed
                                        </styled.p>
                                        <styled.p fontSize="lg" fontWeight="medium">
                                            {runDetails.processedSessions}/{runDetails.totalSessions}
                                        </styled.p>
                                    </Box>

                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="admin.600" mb="1">
                                            Total Rounds
                                        </styled.p>
                                        <styled.p fontSize="lg" fontWeight="medium">
                                            {runDetails.totalRounds}
                                        </styled.p>
                                    </Box>

                                    <Box flex="1">
                                        <styled.p fontSize="sm" color="admin.600" mb="1">
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
                    <Flex gap="3" alignItems="center" flexWrap="wrap">
                        <styled.a
                            href={`/admin/voting-validation/stats/${runId}/download`}
                            display="inline-block"
                            py="2"
                            px="4"
                            color="prose.link"
                            textDecoration="underline"
                        >
                            Export Votes JSON
                        </styled.a>

                        <uploadFetcher.Form method="post" encType="multipart/form-data">
                            <input type="hidden" name="intent" value="upload" />
                            <Flex gap="2" alignItems="center">
                                <styled.input
                                    type="file"
                                    name="file"
                                    accept=".json"
                                    required
                                    fontSize="sm"
                                    p="1"
                                    border="admin-subtle"
                                    borderRadius="md"
                                />
                                <Button
                                    type="submit"
                                    bg="status.success.fg"
                                    color="white"
                                    _hover={{ bg: 'status.success.fg' }}
                                    disabled={uploadFetcher.state !== 'idle'}
                                    size="sm"
                                >
                                    {uploadFetcher.state !== 'idle' ? 'Uploading...' : 'Import Results'}
                                </Button>
                            </Flex>
                        </uploadFetcher.Form>

                        <AppLink
                            to="/admin/voting"
                            display="inline-block"
                            color="prose.link"
                            textDecoration="underline"
                            py="2"
                            px="4"
                            borderRadius="md"
                            fontSize="sm"
                            fontWeight="medium"
                            _hover={{ bg: "admin.800" }}
                        >
                            ← Back to Voting Admin
                        </AppLink>
                    </Flex>
                </Flex>
            </AdminCard>

            {talkResults.length > 0 && (
                <AdminCard mb="6">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        ELO Ranking Results
                    </styled.h2>

                    <Box overflowX="auto">
                        <styled.table width="full" fontSize="sm">
                            <thead>
                                <tr>
                                    <styled.th
                                        textAlign="center"
                                        p="2"
                                        border="admin-emphasis"
                                        width="[60px]"
                                    >
                                        Rank
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" border="admin-emphasis">
                                        Talk Title
                                    </styled.th>
                                    <styled.th textAlign="left" p="2" border="admin-emphasis">
                                        Speaker(s)
                                    </styled.th>
                                    <styled.th
                                        textAlign="center"
                                        p="2"
                                        border="admin-emphasis"
                                        width="[80px]"
                                    >
                                        Wins
                                    </styled.th>
                                    <styled.th
                                        textAlign="center"
                                        p="2"
                                        border="admin-emphasis"
                                        width="[80px]"
                                    >
                                        Losses
                                    </styled.th>
                                    <styled.th
                                        textAlign="center"
                                        p="2"
                                        border="admin-emphasis"
                                        width="[80px]"
                                    >
                                        Total
                                    </styled.th>
                                    <styled.th
                                        textAlign="center"
                                        p="2"
                                        border="admin-emphasis"
                                        width="[80px]"
                                    >
                                        Win %
                                    </styled.th>
                                </tr>
                            </thead>
                            <tbody>
                                {talkResults
                                    .sort((a, b) => {
                                        // Primary sort: by rank (ascending)
                                        if (a.rank !== b.rank) {
                                            return a.rank - b.rank
                                        }
                                        
                                        // Secondary sort (tie-breaker): underrepresented group status (true first)
                                        const aHasUnderrepresented = hasSpeakerFromUnderrepresentedGroup(a.talkId)
                                        const bHasUnderrepresented = hasSpeakerFromUnderrepresentedGroup(b.talkId)
                                        
                                        if (aHasUnderrepresented && !bHasUnderrepresented) return -1
                                        if (!aHasUnderrepresented && bHasUnderrepresented) return 1
                                        
                                        // Tertiary sort: by talkId for consistent ordering
                                        return a.talkId.localeCompare(b.talkId)
                                    })
                                    .map((result) => {
                                    const sessionizeTalk = sessionizeTalks?.find((talk) => talk.id === result.talkId)
                                    const hasUnderrepresented = hasSpeakerFromUnderrepresentedGroup(result.talkId)
                                    return (
                                        <tr key={result.talkId}>
                                            <styled.td
                                                textAlign="center"
                                                p="2"
                                                border="admin-subtle"
                                                fontWeight="semibold"
                                                bg={result.rank <= 3 ? 'status.warning.bg' : 'transparent'}
                                            >
                                                #{result.rank}
                                            </styled.td>
                                            <styled.td
                                                p="2"
                                                border="admin-subtle"
                                                maxW="[400px]"
                                            >
                                                <styled.div
                                                    overflow="hidden"
                                                    textOverflow="ellipsis"
                                                    whiteSpace="nowrap"
                                                    title={sessionizeTalk?.title || result.talkId}
                                                    fontWeight="medium"
                                                >
                                                    {sessionizeTalk?.title || `Talk ${result.talkId}`}
                                                </styled.div>
                                            </styled.td>
                                            <styled.td
                                                p="2"
                                                border="admin-subtle"
                                                fontSize="xs"
                                                color="admin.600"
                                            >
                                                {sessionizeTalk?.speakers.map((speaker) => speaker.name).join(', ') ||
                                                    'Unknown Speaker'}
                                                {hasUnderrepresented && (
                                                    <styled.span
                                                        ml="2"
                                                        px="2"
                                                        py="1"
                                                        bg="status.info.bg"
                                                        color="status.info.fg"
                                                        borderRadius="sm"
                                                        fontSize="xs"
                                                        fontWeight="medium"
                                                        title="Speaker from underrepresented group"
                                                    >
                                                        URG
                                                    </styled.span>
                                                )}
                                            </styled.td>
                                            <styled.td
                                                textAlign="center"
                                                p="2"
                                                border="admin-subtle"
                                                color="status.success.fg"
                                            >
                                                {result.wins}
                                            </styled.td>
                                            <styled.td
                                                textAlign="center"
                                                p="2"
                                                border="admin-subtle"
                                                color="status.danger.fg"
                                            >
                                                {result.losses}
                                            </styled.td>
                                            <styled.td
                                                textAlign="center"
                                                p="2"
                                                border="admin-subtle"
                                            >
                                                {result.totalVotes}
                                            </styled.td>
                                            <styled.td
                                                textAlign="center"
                                                p="2"
                                                border="admin-subtle"
                                                fontWeight="semibold"
                                                color={result.winPct > 50 ? 'status.success.fg' : 'text.primary'}
                                            >
                                                {(result.winPct * 100).toFixed(1)}%
                                            </styled.td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </styled.table>
                    </Box>

                    <styled.p fontSize="sm" color="admin.600" mt="4">
                        Showing {talkResults.length} talks ranked by ELO calculation. Top 3 talks are highlighted.
                        For talks with the same rank, speakers from underrepresented groups (URG) are prioritized.
                    </styled.p>
                </AdminCard>
            )}

            <AdminCard>
                <Flex justifyContent="space-between" alignItems="center" mb="4">
                    <styled.h2 fontSize="xl" fontWeight="semibold">
                        Talk Statistics
                    </styled.h2>

                    <Box>
                        <styled.label fontSize="sm" color="admin.600" mb="1" display="block">
                            Version Filter
                        </styled.label>
                        <styled.select
                            value={versionFilter}
                            onChange={(e) => setVersionFilter(e.target.value as VersionFilter)}
                            bg="white"
                            border="admin-subtle"
                            borderRadius="md"
                            px="3"
                            py="2"
                            fontSize="sm"
                        >
                            <option value="aggregated">Aggregated (All Versions)</option>
                            <option value="v1">V1 Only</option>
                            <option value="v2">V2 Only</option>
                            <option value="v3">V3 Only</option>
                            <option value="v4">V4 Only</option>
                            <option value="v5">V5 Only (Current Algorithm)</option>
                        </styled.select>
                    </Box>
                </Flex>

                {fairnessMetrics[versionFilter] && (
                    <>
                        <styled.h3 fontSize="lg" fontWeight="semibold" mb="3" mt="6">
                            Distribution Metrics (
                            {versionFilter === 'aggregated' ? 'All Versions' : versionFilter.toUpperCase()})
                        </styled.h3>

                        <Flex gap="4" direction={{ base: 'column', sm: 'row' }} flexWrap="wrap" mb="4">
                            <Box flex="1" minW="[150px]">
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Mean Appearances
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].meanAppearances.toFixed(2)}
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="[150px]">
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Standard Deviation
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].standardDeviation.toFixed(2)}
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="[150px]">
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Gini Coefficient
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {fairnessMetrics[versionFilter].giniCoefficient.toFixed(3)}
                                    <styled.span fontSize="sm" color="admin.600" ml="1">
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

                            <Box flex="1" minW="[150px]">
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    CV (Variation)
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {(fairnessMetrics[versionFilter].coefficientOfVariation * 100).toFixed(1)}%
                                </styled.p>
                            </Box>

                            <Box flex="1" minW="[150px]">
                                <styled.p fontSize="sm" color="admin.600" mb="1">
                                    Distribution
                                </styled.p>
                                <styled.p
                                    fontSize="lg"
                                    fontWeight="medium"
                                    color={
                                        fairnessMetrics[versionFilter].isDistributionUniform ? 'status.success.fg' : 'status.danger.fg'
                                    }
                                >
                                    {fairnessMetrics[versionFilter].isDistributionUniform ? 'Uniform' : 'Non-uniform'}
                                </styled.p>
                            </Box>
                        </Flex>

                        <styled.p fontSize="sm" color="admin.600" mb="6">
                            <strong>Interpretation:</strong> Lower Gini coefficient and CV indicate fairer distribution.
                            A Gini coefficient below 0.2 suggests good fairness, while above 0.4 indicates significant
                            inequality.
                        </styled.p>
                    </>
                )}

                <Flex gap="4" direction={{ base: 'column', sm: 'row' }} flexWrap="wrap" mb="6">
                    <Box flex="1" minW="[120px]">
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Talks with Votes
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.talksWithVotes}/{talks.length}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="[120px]">
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Total Votes
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.totalVotesForVersion.toLocaleString()}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="[120px]">
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Times Seen (Avg)
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.avgSeen.toFixed(1)}
                        </styled.p>
                    </Box>

                    <Box flex="1" minW="[120px]">
                        <styled.p fontSize="sm" color="admin.600" mb="1">
                            Range (Min - Max)
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {overallStats.minSeen} - {overallStats.maxSeen}
                        </styled.p>
                    </Box>
                </Flex>

                <styled.p fontSize="sm" color="admin.600" mb="2">
                    Click on column headers to sort the data. Use the distribution metrics above to assess voting
                    fairness.
                </styled.p>

                <Box overflowX="auto">
                    <styled.table width="full" fontSize="sm">
                        <thead>
                            <tr>
                                <styled.th textAlign="left" p="2" border="admin-emphasis">
                                    <Button
                                        onClick={() => handleSort('title')}
                                        variant="plain"
                                        size="sm"
                                        cursor="pointer"
                                    >
                                        Talk Title {getSortIcon('title')}
                                    </Button>
                                </styled.th>
                                <styled.th textAlign="center" p="2" border="admin-emphasis">
                                    <Button
                                        onClick={() => handleSort('seen')}
                                        variant="plain"
                                        size="xs"
                                        cursor="pointer"
                                    >
                                        Times Seen {getSortIcon('seen')}
                                    </Button>
                                </styled.th>
                                <styled.th textAlign="center" p="2" border="admin-emphasis">
                                    Won
                                </styled.th>
                                <styled.th textAlign="center" p="2" border="admin-emphasis">
                                    Lost
                                </styled.th>
                                <styled.th textAlign="center" p="2" border="admin-emphasis">
                                    Skipped
                                </styled.th>
                                <styled.th textAlign="center" p="2" border="admin-emphasis">
                                    <Button
                                        onClick={() => handleSort('win')}
                                        variant="plain"
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
                                        <styled.td p="2" border="admin-subtle" maxW="[300px]">
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
                                            border="admin-subtle"
                                            bg={
                                                runDetails?.totalRounds && stats.timesSeen > runDetails.totalRounds
                                                    ? 'status.info.bg'
                                                    : stats.timesSeen < overallStats.avgSeen * 0.5
                                                      ? 'status.danger.bg'
                                                      : stats.timesSeen > overallStats.avgSeen * 1.5
                                                        ? 'status.warning.bg'
                                                        : 'transparent'
                                            }
                                        >
                                            {stats.timesSeen}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            border="admin-subtle"
                                        >
                                            {stats.votedFor}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            border="admin-subtle"
                                        >
                                            {stats.votedAgainst}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            border="admin-subtle"
                                        >
                                            {stats.skipped}
                                        </styled.td>
                                        <styled.td
                                            textAlign="center"
                                            p="2"
                                            border="admin-subtle"
                                        >
                                            <styled.span
                                                fontWeight={stats.winRate > 50 ? 'semibold' : 'normal'}
                                                color={stats.winRate > 50 ? 'status.success.fg' : 'text.primary'}
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
                    <styled.p textAlign="center" py="8" color="admin.600">
                        No statistics available for this validation run.
                    </styled.p>
                )}
            </AdminCard>
        </AdminLayout>
    )
}
