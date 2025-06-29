import { useLoaderData } from 'react-router'
import { calculateVoteResults, getActiveVotingSession, type SessionData } from '~/lib/azure-storage.server'
import { getVotingSessions } from '~/lib/voting.server'
import { css } from '~/styled-system/css'
import { Box, Container, HStack, VStack, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.voting.results'

export async function loader({ context }: Route.LoaderArgs) {
    // Check if there's an active voting session
    const session = await getActiveVotingSession(context.tableClient, context.conferenceState.conference.year)

    if (!session) {
        return {
            hasResults: false,
            sessions: [],
            totalVotes: 0,
        }
    }

    // Get all sessions
    const sessionsData = await getVotingSessions(context.blobServiceClient, context.conferenceState.conference.year)

    if (!sessionsData) {
        return {
            hasResults: false,
            sessions: [],
            totalVotes: 0,
        }
    }

    // Calculate vote results
    const voteResults = await calculateVoteResults(
        context.blobServiceClient,
        context.tableClient,
        context.conferenceState.conference.year,
        session.sessionId,
    )

    interface SessionWithVotes extends Omit<SessionData, 'categories' | 'speakers'> {
        votes: number
        categories: Array<{
            id: number
            name: string
            categoryItems: Array<{ id: number; name: string }>
        }>
        speakers: Array<{ id: string; name: string }>
    }
    // Combine sessions with their vote counts
    const sessionsWithVotes: SessionWithVotes[] = sessionsData.sessions.map((session) => {
        const { categories = [], speakers = [], ...rest } = session

        return {
            ...rest,
            categories: categories || [],
            speakers: speakers || [],
            votes: voteResults.get(session.id) || 0,
        }
    })

    // Sort by votes (descending)
    sessionsWithVotes.sort((a, b) => b.votes - a.votes)

    // Calculate total votes
    const totalVotes = Array.from(voteResults.values()).reduce((sum, votes) => sum + votes, 0)

    return {
        hasResults: true,
        sessions: sessionsWithVotes,
        totalVotes,
    }
}

export default function VotingResultsPage() {
    const data = useLoaderData<typeof loader>()

    if (!data || !data.hasResults) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl">Voting Results</styled.h2>
                    <styled.p fontSize="lg" color="fg.muted">
                        No voting results available yet.
                    </styled.p>
                </VStack>
            </Container>
        )
    }

    const maxVotes = data.sessions.length > 0 ? Math.max(...data.sessions.map((s) => s.votes)) : 0

    return (
        <Container py={12} maxW="4xl">
            <VStack gap={8}>
                <VStack gap={4}>
                    <styled.h2 fontSize="2xl">Voting Results</styled.h2>
                    <styled.p fontSize="lg" color="fg.muted">
                        Total votes cast: {data.totalVotes}
                    </styled.p>
                </VStack>

                <VStack gap={4} w="full">
                    {data.sessions.map((session, index) => (
                        <Box
                            key={session.id}
                            className={css({
                                p: 6,
                                bg: 'white',
                                borderRadius: 'lg',
                                boxShadow: 'sm',
                                border: '1px solid',
                                borderColor: 'gray.200',
                                transition: 'all 0.2s',
                                _hover: {
                                    boxShadow: 'md',
                                    transform: 'translateY(-2px)',
                                },
                            })}
                        >
                            <VStack gap={3} w="full">
                                <HStack justify="space-between" w="full">
                                    <styled.p
                                        fontWeight="bold"
                                        fontSize="lg"
                                        color={index < 10 ? 'brand.600' : 'fg.default'}
                                    >
                                        #{index + 1}
                                    </styled.p>
                                    <styled.p fontWeight="bold" color="fg.muted">
                                        {session.votes} votes
                                    </styled.p>
                                </HStack>

                                <styled.h2 fontSize="md">{session.title}</styled.h2>

                                {session.speakers.length > 0 && (
                                    <styled.p color="fg.muted">
                                        {session.speakers.map((s) => s.name).join(', ')}
                                    </styled.p>
                                )}

                                {/* Vote percentage bar */}
                                <Box
                                    className={css({
                                        width: 'full',
                                        height: '8px',
                                        bg: 'gray.100',
                                        borderRadius: 'full',
                                        overflow: 'hidden',
                                        mt: 2,
                                    })}
                                >
                                    <Box
                                        className={css({
                                            height: 'full',
                                            bg: index < 10 ? 'brand.500' : 'gray.400',
                                            transition: 'width 0.5s ease',
                                            borderRadius: 'full',
                                        })}
                                        style={{
                                            width: maxVotes > 0 ? `${(session.votes / maxVotes) * 100}%` : '0%',
                                        }}
                                    />
                                </Box>

                                <HStack gap={2} flexWrap="wrap" mt={2}>
                                    {session.categories.map((cat) =>
                                        cat.categoryItems.map((item) => (
                                            <Box
                                                key={`${cat.id}-${item.id}`}
                                                className={css({
                                                    px: 2,
                                                    py: 0.5,
                                                    bg: 'gray.100',
                                                    borderRadius: 'full',
                                                    fontSize: 'xs',
                                                })}
                                            >
                                                {item.name}
                                            </Box>
                                        )),
                                    )}
                                </HStack>
                            </VStack>
                        </Box>
                    ))}
                </VStack>
            </VStack>
        </Container>
    )
}
