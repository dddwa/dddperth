import { DateTime } from 'luxon'
import { useEffect } from 'react'
import { Form, useActionData, useLoaderData, useNavigation, useRevalidator } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { Button } from '~/components/ui/button'
import { requireAdmin } from '~/lib/auth.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { recordException } from '~/lib/record-exception'
import { getUnderrepresentedGroups } from '~/lib/sessionize.server'
import type { StartValidationResponse, VotingValidationGlobal } from '~/lib/voting-validation-types'
import {
    canStartValidation,
    getUnderrepresentedGroupsConfig,
    getValidationRuns,
    markValidationStarted,
    runVotingValidation,
    saveUnderrepresentedGroupsConfig,
} from '~/lib/voting-validation.server'
import type { VotingGlobal } from '~/lib/voting.server'
import { ensureVotesTableExists, getSessionsForVoting, getVotesTableName } from '~/lib/voting.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.voting'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    // Get the voting session counter
    let sessionCount = 0
    let validationRuns = {
        runs: [] as Array<{
            runId: string
            status: string
            startedAt: string
            completedAt?: string
            lastUpdatedAt: string
            totalSessions: number
            processedSessions: number
            percentComplete: number
        }>,
        isRunning: false as boolean,
        currentRunId: undefined as string | undefined,
    }

    try {
        // Ensure the votes table exists
        const tableClient = await ensureVotesTableExists(context.tableServiceClient, context.getTableClient, year)

        try {
            const partitionKey: VotingGlobal['partitionKey'] = 'ddd'
            const rowKey: VotingGlobal['rowKey'] = 'voting'
            const entity: VotingGlobal = await tableClient.getEntity(partitionKey, rowKey)
            sessionCount = entity.numberSessions || 0
        } catch (error: any) {
            if (error.statusCode !== 404) {
                console.error('Error getting session count:', error)
            }
            // If entity doesn't exist, sessionCount remains 0
        }

        // Get validation runs
        const runs = await getValidationRuns(tableClient, 5) // Get last 5 runs

        // Get current validation status
        let isRunning = false
        let currentRunId: string | undefined

        try {
            const partitionKey: VotingValidationGlobal['partitionKey'] = 'ddd'
            const rowKey: VotingValidationGlobal['rowKey'] = 'voting_validation'
            const globalEntity: VotingValidationGlobal = await tableClient.getEntity(partitionKey, rowKey)
            isRunning = globalEntity.isRunning
            currentRunId = globalEntity.currentRunId
        } catch (error: any) {
            if (error.statusCode !== 404) {
                console.error('Error getting validation status:', error)
            }
            recordException(error)
        }

        validationRuns = {
            runs: runs.map((run) => ({
                runId: run.runId,
                status: run.status,
                startedAt: run.startedAt,
                completedAt: run.completedAt,
                lastUpdatedAt: run.lastUpdatedAt,
                totalSessions: run.totalSessions,
                processedSessions: run.processedSessions,
                percentComplete:
                    run.totalSessions > 0 ? Math.round((run.processedSessions / run.totalSessions) * 100) : 0,
            })),
            currentRunId,
            isRunning,
        }
    } catch (error: any) {
        if (error.statusCode !== 404) {
            console.error('Error getting session count:', error)
        }
        // If entity doesn't exist, sessionCount remains 0
        recordException(error)
    }

    // Get underrepresented groups data
    let underrepresentedGroups: {
        availableGroups: string[]
        selectedGroups: string[]
        error?: string
    } = {
        availableGroups: [],
        selectedGroups: [],
    }

    try {
        const yearConfig = getYearConfig(year)
        if (
            yearConfig.kind === 'conference' &&
            yearConfig.sessions?.kind === 'sessionize' &&
            yearConfig.sessions.underrepresentedGroupsQuestionId &&
            yearConfig.sessions.allSessionsEndpoint
        ) {
            // Get groups from current year's Sessionize speakers
            const currentYearGroups = await getUnderrepresentedGroups({
                sessionizeEndpoint: yearConfig.sessions.allSessionsEndpoint,
                underrepresentedGroupsQuestionId: yearConfig.sessions.underrepresentedGroupsQuestionId,
            })

            // Get currently selected groups from table storage (accumulated from all years)
            const tableName = getVotesTableName(year)
            const selectedGroups = await getUnderrepresentedGroupsConfig(context.getTableClient(tableName))

            // Combine all groups (existing config + current year) and remove duplicates
            const allAvailableGroups = Array.from(new Set([...selectedGroups, ...currentYearGroups])).sort()

            underrepresentedGroups = {
                availableGroups: allAvailableGroups,
                selectedGroups: selectedGroups,
            }
        }
    } catch (error: any) {
        console.error('Error fetching underrepresented groups:', error)
        underrepresentedGroups.error = 'Failed to load underrepresented groups data'
        recordException(error)
    }

    return {
        votingState: conferenceState.talkVoting.state,
        conferenceState,
        sessionCount,
        validationRuns,
        underrepresentedGroups,
    }
}

export async function action({
    request,
    context,
}: Route.ActionArgs): Promise<
    { success: true; message: string } | { success: false; error: string } | StartValidationResponse
> {
    await requireAdmin(request)

    const formData = await request.formData()
    const intent = formData.get('intent')

    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    // Ensure the votes table exists
    const tableClient = await ensureVotesTableExists(context.tableServiceClient, context.getTableClient, year)

    // Handle underrepresented groups update
    if (intent === 'update_underrepresented_groups') {
        try {
            const selectedGroups: string[] = []
            for (const [key, value] of formData.entries()) {
                if (key.startsWith('group_') && value === 'on') {
                    const groupName = key.slice(6) // Remove 'group_' prefix
                    selectedGroups.push(decodeURIComponent(groupName))
                }
            }

            await saveUnderrepresentedGroupsConfig(tableClient, year, selectedGroups)

            return { success: true, message: 'Underrepresented groups updated successfully' }
        } catch (error: any) {
            console.error('Error updating underrepresented groups:', error)
            recordException(error)
            return { success: false, error: 'Failed to update underrepresented groups' }
        }
    }

    try {
        // Check if validation can be started
        const canStart = await canStartValidation(tableClient)

        if (!canStart.canStart) {
            const response: StartValidationResponse = {
                success: false,
                error: canStart.reason || 'Cannot start validation',
                alreadyRunning: true,
            }
            return response
        }

        // Get current talks
        const yearConfig = getYearConfig(context.conferenceState.conference.year)

        if (yearConfig.kind === 'cancelled') {
            return {
                success: false,
                error: 'Conference cancelled this year',
            }
        }

        if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
            return {
                success: false,
                error: 'Sessionize endpoint not configured. Please ensure the all sessions env var for the current conference year is set.',
            }
        }

        const talks = await getSessionsForVoting(yearConfig.sessions.allSessionsEndpoint)

        if (talks.length === 0) {
            return {
                success: false,
                error: 'No talks available for validation',
            }
        }

        // Generate run ID
        const runId = crypto.randomUUID()

        // Mark validation as started
        await markValidationStarted(tableClient, runId)

        // Start the validation process in the background
        // Note: In a production environment, this would be better handled by a queue or background job
        runVotingValidation(tableClient, year, talks).catch((error) => {
            recordException(error)
            console.error('Validation process error:', error)
        })

        const response: StartValidationResponse = {
            success: true,
            runId,
        }

        return response
    } catch (error) {
        console.error('Error starting validation:', error)

        return {
            success: false,
            error: 'Failed to start validation process',
        }
    }
}

export default function AdminVoting() {
    const { votingState, conferenceState, sessionCount, validationRuns, underrepresentedGroups } =
        useLoaderData<typeof loader>()
    const revalidator = useRevalidator()
    const navigation = useNavigation()
    const actionData = useActionData<typeof action>()

    // Refresh validation runs every 5 seconds if a validation is running
    useEffect(() => {
        if (validationRuns.isRunning) {
            const interval = setInterval(() => {
                void revalidator.revalidate()
            }, 5000)

            return () => clearInterval(interval)
        }
    }, [validationRuns.isRunning, revalidator])

    return (
        <AdminLayout heading="Voting Administration">
            <AdminCard mb="6">
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Voting Status
                </styled.h2>

                <Flex gap="6" direction={{ base: 'column', md: 'row' }}>
                    <Box flex="1">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Status
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium" textTransform="capitalize">
                            {votingState}
                        </styled.p>
                    </Box>

                    <Box flex="1">
                        <styled.p fontSize="sm" color="gray.600" mb="1">
                            Total Voting Sessions
                        </styled.p>
                        <styled.p fontSize="lg" fontWeight="medium">
                            {sessionCount}
                        </styled.p>
                    </Box>

                    {conferenceState.talkVoting.state === 'open' && (
                        <Box flex="1">
                            <styled.p fontSize="sm" color="gray.600" mb="1">
                                Closes
                            </styled.p>
                            <styled.p fontSize="lg" fontWeight="medium">
                                {DateTime.fromISO(conferenceState.talkVoting.closes).toLocaleString(
                                    DateTime.DATETIME_SHORT,
                                    {
                                        locale: 'en-AU',
                                    },
                                )}
                            </styled.p>
                        </Box>
                    )}

                    {conferenceState.talkVoting.state === 'not-open-yet' && conferenceState.talkVoting.opens && (
                        <>
                            <Box flex="1">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Opens
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {DateTime.fromISO(conferenceState.talkVoting.opens).toLocaleString(
                                        DateTime.DATETIME_SHORT,
                                        {
                                            locale: 'en-AU',
                                        },
                                    )}
                                </styled.p>
                            </Box>
                            <Box flex="1">
                                <styled.p fontSize="sm" color="gray.600" mb="1">
                                    Closes
                                </styled.p>
                                <styled.p fontSize="lg" fontWeight="medium">
                                    {DateTime.fromISO(conferenceState.talkVoting.closes).toLocaleString(
                                        DateTime.DATETIME_SHORT,
                                        {
                                            locale: 'en-AU',
                                        },
                                    )}
                                </styled.p>
                            </Box>
                        </>
                    )}
                </Flex>
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Admin Actions
                </styled.h2>

                {votingState === 'closed' ? (
                    <styled.p color="gray.600">Voting has closed for this conference.</styled.p>
                ) : votingState === 'not-open-yet' ? (
                    <Box>
                        <styled.p color="gray.600" mb="4">
                            Voting hasn't opened yet, but as an admin you can jump forward in time to start voting.
                        </styled.p>
                        <Flex gap="4">
                            <AppLink
                                to="/admin/settings"
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
                                Configure Date Override
                            </AppLink>
                        </Flex>
                    </Box>
                ) : (
                    <Box>
                        <styled.p color="gray.600" mb="4">
                            Voting is currently open.
                        </styled.p>
                        <Flex gap="4" alignItems="flex-start">
                            <AppLink
                                to="/voting"
                                display="inline-block"
                                bg="accent.7"
                                color="white"
                                py="2"
                                px="4"
                                borderRadius="md"
                                textDecoration="none"
                                fontSize="sm"
                                fontWeight="medium"
                                _hover={{ bg: 'accent.8' }}
                            >
                                Go to Voting
                            </AppLink>
                        </Flex>
                    </Box>
                )}
            </AdminCard>

            {underrepresentedGroups.availableGroups.length > 0 && (
                <AdminCard mb="6">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                        Underrepresented Groups Configuration
                    </styled.h2>

                    {underrepresentedGroups.error && (
                        <styled.p color="red.600" mb="4">
                            Error: {underrepresentedGroups.error}
                        </styled.p>
                    )}

                    {actionData?.success && actionData?.message && (
                        <styled.p color="green.600" mb="4">
                            {actionData.message}
                        </styled.p>
                    )}

                    {actionData?.success === false && actionData?.error && (
                        <styled.p color="red.600" mb="4">
                            Error: {actionData.error}
                        </styled.p>
                    )}

                    <Form method="post">
                        <input type="hidden" name="intent" value="update_underrepresented_groups" />

                        <Box mb="4">
                            <styled.p fontSize="sm" fontWeight="medium" mb="3">
                                Available Groups ({underrepresentedGroups.availableGroups.length} found):
                            </styled.p>

                            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap="2">
                                {underrepresentedGroups.availableGroups.map((group) => {
                                    const isSelected = underrepresentedGroups.selectedGroups.includes(group)
                                    const fieldName = `group_${encodeURIComponent(group)}`

                                    return (
                                        <Flex
                                            key={group}
                                            alignItems="center"
                                            gap="2"
                                            p="2"
                                            borderRadius="md"
                                            _hover={{ bg: 'gray.50' }}
                                        >
                                            <input
                                                type="checkbox"
                                                id={fieldName}
                                                name={fieldName}
                                                defaultChecked={isSelected}
                                            />
                                            <styled.label htmlFor={fieldName} fontSize="sm" cursor="pointer" flex="1">
                                                {group}
                                            </styled.label>
                                        </Flex>
                                    )
                                })}
                            </Box>
                        </Box>

                        <Flex gap="4" alignItems="center">
                            <Button
                                type="submit"
                                disabled={navigation.state === 'submitting'}
                                variant="solid"
                                size="sm"
                            >
                                {navigation.state === 'submitting' ? 'Saving...' : 'Save Selection'}
                            </Button>

                            <styled.span fontSize="sm" color="gray.600">
                                {underrepresentedGroups.selectedGroups.length} of{' '}
                                {underrepresentedGroups.availableGroups.length} groups selected
                            </styled.span>
                        </Flex>
                    </Form>
                </AdminCard>
            )}

            <AdminCard mb="6">
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Voting Validation
                </styled.h2>

                <styled.p color="gray.600" mb="4">
                    Run validation to calculate statistics for all talks based on voting data. This process analyzes how
                    many times each talk has been seen and voted for.
                </styled.p>

                <Flex gap="4" mb="6">
                    <Form method="post">
                        <Button
                            type="submit"
                            disabled={validationRuns.isRunning || navigation.state === 'submitting'}
                            variant="solid"
                            size="sm"
                        >
                            {validationRuns.isRunning ? 'Validation Running...' : 'Start Validation'}
                        </Button>
                    </Form>

                    {validationRuns.isRunning && validationRuns.runs[0]?.status === 'running' && (
                        <styled.span color="gray.600" alignSelf="center">
                            Progress: {validationRuns.runs[0].percentComplete}% (
                            {validationRuns.runs[0].processedSessions}/{validationRuns.runs[0].totalSessions} sessions)
                        </styled.span>
                    )}
                </Flex>

                {!actionData?.success && actionData?.error ? (
                    <styled.p color="red.600" mb="4">
                        Error: {actionData.error}
                    </styled.p>
                ) : null}

                {validationRuns.runs.length > 0 && (
                    <Box>
                        <styled.h3 fontSize="md" fontWeight="semibold" mb="3">
                            Recent Validation Runs
                        </styled.h3>

                        <Box overflowX="auto">
                            <styled.table width="100%" fontSize="sm">
                                <thead>
                                    <tr>
                                        <styled.th
                                            textAlign="left"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.200"
                                        >
                                            Started
                                        </styled.th>
                                        <styled.th
                                            textAlign="left"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.200"
                                        >
                                            Status
                                        </styled.th>
                                        <styled.th
                                            textAlign="left"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.200"
                                        >
                                            Progress
                                        </styled.th>
                                        <styled.th
                                            textAlign="left"
                                            p="2"
                                            borderBottom="1px solid"
                                            borderColor="gray.200"
                                        >
                                            Actions
                                        </styled.th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validationRuns.runs.map((run) => (
                                        <tr key={run.runId}>
                                            <styled.td p="2" borderBottom="1px solid" borderColor="gray.100">
                                                {DateTime.fromISO(run.startedAt).toLocaleString(
                                                    DateTime.DATETIME_SHORT,
                                                    {
                                                        locale: 'en-AU',
                                                    },
                                                )}
                                            </styled.td>
                                            <styled.td p="2" borderBottom="1px solid" borderColor="gray.100">
                                                <styled.span
                                                    px="2"
                                                    py="1"
                                                    borderRadius="full"
                                                    fontSize="xs"
                                                    fontWeight="medium"
                                                    bg={
                                                        run.status === 'completed'
                                                            ? 'green.100'
                                                            : run.status === 'running'
                                                              ? 'blue.100'
                                                              : 'red.100'
                                                    }
                                                    color={
                                                        run.status === 'completed'
                                                            ? 'green.800'
                                                            : run.status === 'running'
                                                              ? 'blue.800'
                                                              : 'red.800'
                                                    }
                                                >
                                                    {run.status}
                                                </styled.span>
                                            </styled.td>
                                            <styled.td p="2" borderBottom="1px solid" borderColor="gray.100">
                                                {run.processedSessions}/{run.totalSessions} ({run.percentComplete}%)
                                            </styled.td>
                                            <styled.td p="2" borderBottom="1px solid" borderColor="gray.100">
                                                <AppLink
                                                    to={`/admin/voting-validation/stats/${run.runId}`}
                                                    fontSize="sm"
                                                    color="accent.7"
                                                    _hover={{ textDecoration: 'underline' }}
                                                >
                                                    View Stats
                                                </AppLink>
                                            </styled.td>
                                        </tr>
                                    ))}
                                </tbody>
                            </styled.table>
                        </Box>
                    </Box>
                )}
            </AdminCard>
        </AdminLayout>
    )
}
