import { DateTime } from 'luxon'
import { useLoaderData } from 'react-router'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { getActiveVotingSession, getVotingPairs } from '~/lib/azure-storage.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.voting'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const conferenceState = context.conferenceState

    // Check if voting is configured
    const votingState = conferenceState.talkVoting.state

    // Get voting session if it exists
    const activeSession = await getActiveVotingSession(context.tableClient, conferenceState.conference.year)
    const votingPairs = activeSession
        ? await getVotingPairs(context.blobServiceClient, conferenceState.conference.year)
        : null

    return {
        votingState,
        conferenceState,
        activeSession,
        votingPairs,
    }
}

export default function AdminVoting() {
    const { votingState, conferenceState, activeSession, votingPairs } = useLoaderData<typeof loader>()

    return (
        <Box p="8" maxW="7xl" mx="auto">
            <styled.h1 fontSize="3xl" fontWeight="bold" mb="8">
                Voting Administration
            </styled.h1>

            <Box bg="white" p="6" borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.200" mb="6">
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
            </Box>

            <Box bg="white" p="6" borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.200">
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="4">
                    Admin Actions
                </styled.h2>

                {votingState === 'closed' ? (
                    <styled.p color="gray.600">Voting has closed for this conference.</styled.p>
                ) : votingState === 'not-open-yet' ? (
                    <Box>
                        <styled.p color="gray.600" mb="4">
                            Voting hasn't opened yet, but as an admin you can vote early.
                        </styled.p>
                        <styled.p color="orange.600" fontSize="sm" mb="4">
                            Note: Make sure you have set a date override in settings to simulate the voting period.
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
                            <AppLink
                                to="/voting/results"
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
                                View Results
                            </AppLink>
                        </Flex>
                    </Box>
                )}

                {activeSession && votingPairs && (
                    <Box mt="6" pt="6" borderTop="1px solid" borderColor="gray.200">
                        <styled.h3 fontSize="lg" fontWeight="medium" mb="2">
                            Session Information
                        </styled.h3>
                        <styled.p fontSize="sm" color="gray.600">
                            Active Session ID: {activeSession.sessionId}
                        </styled.p>
                        <styled.p fontSize="sm" color="gray.600">
                            Total Pairs: {votingPairs.pairs.length}
                        </styled.p>
                    </Box>
                )}
            </Box>
        </Box>
    )
}
