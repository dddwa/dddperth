import { DateTime } from 'luxon'
import { useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { getVotesTableName } from '~/lib/voting.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.voting'

export async function loader({ request, context }: Route.LoaderArgs) {
    await requireAdmin(request)

    const conferenceState = context.conferenceState
    const year = conferenceState.conference.year

    // Get the voting session counter
    let sessionCount = 0
    try {
        const tableName = getVotesTableName(year)
        const tableClient = context.getTableClient(tableName)

        const entity = await tableClient.getEntity('ddd', 'voting')
        sessionCount = (entity.numberSessions as number) || 0
    } catch (error: any) {
        if (error.statusCode !== 404) {
            console.error('Error getting session count:', error)
        }
        // If entity doesn't exist, sessionCount remains 0
    }

    return {
        votingState: conferenceState.talkVoting.state,
        conferenceState,
        sessionCount,
    }
}

export default function AdminVoting() {
    const { votingState, conferenceState, sessionCount } = useLoaderData<typeof loader>()

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
        </AdminLayout>
    )
}
