import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { data, Form, redirect, useLoaderData, useNavigation } from 'react-router'
import { Button } from '~/components/ui/button'
import { getActiveVotingSession, getVotingPairs, getVotingProgress, recordVote } from '~/lib/azure-storage.server'
import { getYearConfig } from '~/lib/get-year-config.server'
import { initializeVoting } from '~/lib/voting.server'
import { css } from '~/styled-system/css'
import { Box, Container, Flex, HStack, styled, VStack } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.voting'

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'Conference cancelled this year' }), { status: 404 })
    }

    if (context.conferenceState.talkVoting.state === 'not-open-yet') {
        return {
            talkVoting: context.conferenceState.talkVoting,
            currentPair: null,
            progress: null,
            totalPairs: 0,
            sessionId: null,
        }
    }

    // Check if Sessionize endpoint is configured
    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
        return {
            talkVoting: context.conferenceState.talkVoting,
            currentPair: null,
            progress: null,
            totalPairs: 0,
            sessionId: null,
            error: 'Sessionize endpoint not configured. Please ensure the all sessions env var for the current conference year is set.',
        }
    }

    // Get or create active voting session
    let session = await getActiveVotingSession(context.tableClient, context.conferenceState.conference.year)

    if (!session) {
        // Initialize voting if not started
        try {
            const sessionId = await initializeVoting(
                context.blobServiceClient,
                context.tableServiceClient,
                context.tableClient,
                yearConfig,
                context.conferenceState,
            )
            session = await getActiveVotingSession(context.tableClient, context.conferenceState.conference.year)
        } catch (error) {
            console.error('Failed to initialize voting:', error)
            return {
                talkVoting: context.conferenceState.talkVoting,
                currentPair: null,
                progress: null,
                totalPairs: 0,
                sessionId: null,
                error: 'Failed to initialize voting',
            }
        }
    }

    if (!session) {
        throw new Error('Failed to get voting session')
    }

    // Get voting pairs and progress
    const pairs = await getVotingPairs(context.blobServiceClient, context.conferenceState.conference.year)
    const progress = await getVotingProgress(context.blobServiceClient, session.sessionId)

    if (!pairs) {
        throw new Error('Voting pairs not found')
    }

    // Get current pair based on progress
    const currentPair = progress.currentIndex < pairs.pairs.length ? pairs.pairs[progress.currentIndex] : null

    return {
        talkVoting: context.conferenceState.talkVoting,
        currentPair,
        progress: {
            current: progress.currentIndex,
            total: pairs.pairs.length,
            votes: progress.votes,
        },
        totalPairs: pairs.pairs.length,
        sessionId: session.sessionId,
    }
}

export async function action({ request, context }: Route.ActionArgs) {
    const formData = await request.formData()
    const vote = formData.get('vote') as 'A' | 'B'
    const sessionId = formData.get('sessionId') as string

    if (!vote || !sessionId) {
        return data({ error: 'Invalid vote', status: 400 })
    }

    try {
        await recordVote(context.blobServiceClient, sessionId, vote)
        return redirect('/voting')
    } catch (error) {
        console.error('Failed to record vote:', error)
        return data({ error: 'Failed to record vote', status: 500 })
    }
}

export default function VotingPage() {
    const data = useLoaderData<typeof loader>()
    const navigation = useNavigation()
    const [selectedVote, setSelectedVote] = useState<'A' | 'B' | null>(null)

    const isSubmitting = navigation.state === 'submitting'

    useEffect(() => {
        // Reset selection when new pair loads
        setSelectedVote(null)
    }, [data.currentPair])

    if (data.talkVoting.state === 'not-open-yet') {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl">Talk Voting</styled.h2>
                    <styled.p fontSize="lg" color="fg.muted" textAlign="center">
                        {data.talkVoting.opens
                            ? `Voting opens ${DateTime.fromISO(data.talkVoting.opens).toLocaleString(
                                  DateTime.DATETIME_SHORT,
                                  {
                                      locale: 'en-AU',
                                  },
                              )} and closes ${DateTime.fromISO(data.talkVoting.closes).toLocaleString(
                                  DateTime.DATETIME_SHORT,
                                  {
                                      locale: 'en-AU',
                                  },
                              )}`
                            : 'Voting is not available for this conference'}
                    </styled.p>
                </VStack>
            </Container>
        )
    }

    if ('error' in data) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl">Talk Voting</styled.h2>
                    <styled.p fontSize="lg" color="red.500">
                        {data.error}
                    </styled.p>
                </VStack>
            </Container>
        )
    }

    if (!data.currentPair) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl">Thank You!</styled.h2>
                    <styled.p fontSize="lg" color="fg.muted" textAlign="center">
                        You've completed all voting pairs. Thank you for helping us select the best talks!
                    </styled.p>
                    {data.progress && (
                        <styled.p fontSize="md" color="fg.subtle">
                            Total votes: {data.progress.current}
                        </styled.p>
                    )}
                </VStack>
            </Container>
        )
    }

    const pair = data.currentPair

    return (
        <Container py={12} maxW="6xl">
            <VStack gap={8}>
                <VStack gap={4}>
                    <styled.h2 fontSize="2xl">Which talk would you prefer to see?</styled.h2>
                    <styled.p fontSize="lg" color="fg.muted">
                        Progress: {data.progress?.current || 0} / {data.totalPairs}
                    </styled.p>
                    <Box
                        className={css({
                            width: 'full',
                            maxW: '400px',
                            height: '8px',
                            bg: 'gray.200',
                            borderRadius: 'full',
                            overflow: 'hidden',
                        })}
                    >
                        <Box
                            className={css({
                                height: 'full',
                                bg: 'brand.500',
                                transition: 'width 0.3s ease',
                                borderRadius: 'full',
                            })}
                            style={{
                                width: `${((data.progress?.current || 0) / data.totalPairs) * 100}%`,
                            }}
                        />
                    </Box>
                </VStack>

                <Form method="post">
                    <input type="hidden" name="sessionId" value={data.sessionId || ''} />
                    <input type="hidden" name="vote" value={selectedVote || ''} />

                    <Flex gap={6} direction={{ base: 'column', lg: 'row' }}>
                        {/* Left Session Card */}
                        <Box
                            flex={1}
                            className={css({
                                borderRadius: 'lg',
                                border: '2px solid',
                                borderColor: selectedVote === 'A' ? 'brand.500' : 'gray.200',
                                bg: selectedVote === 'A' ? 'brand.50' : 'white',
                                p: 6,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                _hover: {
                                    borderColor: selectedVote === 'A' ? 'brand.600' : 'gray.300',
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'lg',
                                },
                            })}
                            onClick={() => setSelectedVote('A')}
                        >
                            <VStack gap={4}>
                                <styled.h2 fontSize="lg">{pair.left.title}</styled.h2>

                                {pair.left.speakers.length > 0 && (
                                    <styled.p color="fg.muted" fontWeight="medium">
                                        {pair.left.speakers.map((s) => s.name).join(', ')}
                                    </styled.p>
                                )}

                                {pair.left.description && (
                                    <styled.p
                                        color="fg.subtle"
                                        className={css({
                                            display: '-webkit-box',
                                            WebkitLineClamp: 6,
                                            overflow: 'hidden',
                                        })}
                                    >
                                        {pair.left.description}
                                    </styled.p>
                                )}

                                <HStack gap={2} flexWrap="wrap">
                                    {pair.left.categories.map((cat) =>
                                        cat.categoryItems.map((item) => (
                                            <Box
                                                key={`${cat.id}-${item.id}`}
                                                className={css({
                                                    px: 3,
                                                    py: 1,
                                                    bg: 'gray.100',
                                                    borderRadius: 'full',
                                                    fontSize: 'sm',
                                                })}
                                            >
                                                {item.name}
                                            </Box>
                                        )),
                                    )}
                                </HStack>
                            </VStack>
                        </Box>

                        {/* VS Divider */}
                        <Flex justify="center" px={4}>
                            <styled.p
                                fontSize="2xl"
                                fontWeight="bold"
                                color="fg.muted"
                                display={{ base: 'none', lg: 'block' }}
                            >
                                VS
                            </styled.p>
                        </Flex>

                        {/* Right Session Card */}
                        <Box
                            flex={1}
                            className={css({
                                borderRadius: 'lg',
                                border: '2px solid',
                                borderColor: selectedVote === 'B' ? 'brand.500' : 'gray.200',
                                bg: selectedVote === 'B' ? 'brand.50' : 'white',
                                p: 6,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                _hover: {
                                    borderColor: selectedVote === 'B' ? 'brand.600' : 'gray.300',
                                    transform: 'translateY(-2px)',
                                    boxShadow: 'lg',
                                },
                            })}
                            onClick={() => setSelectedVote('B')}
                        >
                            <VStack gap={4}>
                                <styled.h2 fontSize="lg">{pair.right.title}</styled.h2>

                                {pair.right.speakers.length > 0 && (
                                    <styled.p color="fg.muted" fontWeight="medium">
                                        {pair.right.speakers.map((s) => s.name).join(', ')}
                                    </styled.p>
                                )}

                                {pair.right.description && (
                                    <styled.p
                                        color="fg.subtle"
                                        className={css({
                                            display: '-webkit-box',
                                            WebkitLineClamp: 6,
                                            overflow: 'hidden',
                                        })}
                                    >
                                        {pair.right.description}
                                    </styled.p>
                                )}

                                <HStack gap={2} flexWrap="wrap">
                                    {pair.right.categories.map((cat) =>
                                        cat.categoryItems.map((item) => (
                                            <Box
                                                key={`${cat.id}-${item.id}`}
                                                className={css({
                                                    px: 3,
                                                    py: 1,
                                                    bg: 'gray.100',
                                                    borderRadius: 'full',
                                                    fontSize: 'sm',
                                                })}
                                            >
                                                {item.name}
                                            </Box>
                                        )),
                                    )}
                                </HStack>
                            </VStack>
                        </Box>
                    </Flex>

                    <Flex justify="center" mt={8}>
                        <Button type="submit" size="lg" disabled={!selectedVote || isSubmitting} loading={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Vote'}
                        </Button>
                    </Flex>
                </Form>
            </VStack>
        </Container>
    )
}
