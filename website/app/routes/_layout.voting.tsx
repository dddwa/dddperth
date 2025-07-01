import { DateTime } from 'luxon'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Await, useLoaderData } from 'react-router'
import { TalkOptionCard } from '~/components/TalkOptionCard'
import { Button } from '~/components/ui/button'
import { getYearConfig } from '~/lib/get-year-config.server'
import type { VotingApiResponse } from '~/lib/voting-api-types'
import { isVotingBatchResponse, isVotingErrorResponse } from '~/lib/voting-api-types'
import type { TalkPair } from '~/lib/voting.server'
import { ensureVotesTableExists, getSessionsForVoting, getVotingSession } from '~/lib/voting.server'
import { Container, Flex, HStack, styled, VStack } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.voting'

export async function loader({ request, context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'Conference cancelled this year' }), { status: 404 })
    }

    if (
        context.conferenceState.talkVoting.state === 'not-open-yet' ||
        context.conferenceState.talkVoting.state === 'closed'
    ) {
        return {
            talkVoting: context.conferenceState.talkVoting,
            votingSession: {
                sessionId: null,
                startingIndex: 0,
            },
            hasSession: false,
        }
    }

    // Check if Sessionize endpoint is configured
    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
        return {
            talkVoting: context.conferenceState.talkVoting,
            votingSession: {
                sessionId: null,
                startingIndex: 0,
            },
            hasSession: false,
            error: 'Sessionize endpoint not configured. Please ensure the all sessions env var for the current conference year is set.',
        }
    }

    const sessions = await getSessionsForVoting(yearConfig.sessions.allSessionsEndpoint)
    const tableClient = await ensureVotesTableExists(
        context.tableServiceClient,
        context.getTableClient,
        context.conferenceState.conference.year,
    )

    // This will create a session and redirect
    const votingSession = getVotingSession(request, tableClient, sessions)

    return {
        talkVoting: context.conferenceState.talkVoting,
        votingSession: await votingSession.then((session) => ({
            sessionId: session.sessionId,
            startingIndex: session.currentIndex,
        })),
        hasSession: true,
    }
}

export default function VotingPage() {
    const data = useLoaderData<typeof loader>()

    return (
        <Suspense fallback={<VotingMessage message="Setting up your voting session..." />}>
            <Await resolve={data.votingSession}>
                {(votingSession) => (
                    <VotingPageWithSession
                        sessionId={votingSession.sessionId}
                        startingIndex={votingSession.startingIndex}
                    />
                )}
            </Await>
        </Suspense>
    )
}

function VotingPageWithSession({ sessionId, startingIndex }: { sessionId: string | null; startingIndex: number }) {
    const data = useLoaderData<typeof loader>()
    const [currentPairIndex, setCurrentPairIndex] = useState(0)
    const [overallIndex, setOverallIndex] = useState(startingIndex)
    const [pairs, setPairs] = useState<TalkPair[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fetchingRef = useRef(false)
    const nextBatchFetchedRef = useRef(false)
    const [voteSubmitted, setVoteSubmitted] = useState<'A' | 'B' | 'skip' | null>(null)
    const startingIndexRef = useRef(startingIndex)

    // Fetch initial batch on mount
    useEffect(() => {
        if (sessionId && data.talkVoting.state === 'open') {
            void fetchBatch()
        }
    }, [sessionId])

    // Check if we need to fetch next batch
    useEffect(() => {
        const remainingInBatch = pairs.length - currentPairIndex
        if (remainingInBatch <= 10 && remainingInBatch >= 0 && !nextBatchFetchedRef.current && !fetchingRef.current) {
            nextBatchFetchedRef.current = true
            void fetchNextBatch()
        }
    }, [currentPairIndex, pairs.length])

    async function fetchBatch() {
        if (fetchingRef.current) return
        fetchingRef.current = true
        setIsLoading(true)
        setError(null)

        try {
            const response = await fetch('/api/voting/batch', { redirect: 'manual' })

            // Handle 302 redirects (session migration, session reset, etc.)
            if (response.status === 302) {
                // The server wants us to redirect - trigger a full page refresh
                window.location.href = '/voting'
                return
            }

            const result: VotingApiResponse = await response.json()

            if (!response.ok) {
                if (isVotingErrorResponse(result)) {
                    if (result.needsSession) {
                        // Redirect to create session
                        window.location.href = '/voting'
                        return
                    }
                    throw new Error(result.error)
                }
                throw new Error('Failed to fetch voting batch')
            }

            // Use type guard to ensure we have the correct response type
            if (!isVotingBatchResponse(result)) {
                console.error('Invalid voting batch response:', result)
                throw new Error('Invalid voting batch response structure')
            }

            setPairs(result.batch.pairs)
            setCurrentPairIndex(0)
            nextBatchFetchedRef.current = false
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load voting data')
        } finally {
            setIsLoading(false)
            fetchingRef.current = false
        }
    }

    async function fetchNextBatch() {
        if (fetchingRef.current) return
        fetchingRef.current = true

        try {
            // Calculate the index of the next pair to fetch based on stable starting index + loaded pairs
            const nextIndex = startingIndexRef.current + pairs.length
            const response = await fetch(`/api/voting/batch?from=${nextIndex}`, { redirect: 'manual' })

            // Handle 302 redirects (session migration, session reset, etc.)
            if (response.status === 302) {
                // The server wants us to redirect - trigger a full page refresh
                window.location.href = '/voting'
                return
            }

            const result: VotingApiResponse = await response.json()

            if (response.ok && isVotingBatchResponse(result)) {
                // Deduplicate pairs based on index
                setPairs((prev) => {
                    const existingIndices = new Set(prev.map((p) => p.index))
                    const newPairs = result.batch.pairs.filter((pair) => !existingIndices.has(pair.index))
                    return [...prev, ...newPairs]
                })
            }
        } catch (err) {
            console.error('Failed to fetch next batch:', err)
        } finally {
            fetchingRef.current = false
        }
    }

    async function handleVote(vote: 'A' | 'B' | 'skip') {
        const currentPair = pairs[currentPairIndex]
        if (!currentPair) return

        // Show vote feedback and start transition
        setVoteSubmitted(vote)

        // Fire and forget vote submission
        const formData = new FormData()
        formData.append('vote', vote)
        formData.append('voteIndex', currentPair.index.toString())

        void fetch('/api/voting/vote', {
            redirect: 'manual',
            method: 'POST',
            body: formData,
        }).catch((err) => {
            console.error('Failed to submit vote:', err)
        })

        // Wait for animation, then move to next pair
        setTimeout(() => {
            setCurrentPairIndex((prev) => prev + 1)
            setOverallIndex((prev) => prev + 1)
            setVoteSubmitted(null)
        }, 300)
    }

    if (data.talkVoting.state === 'not-open-yet') {
        return (
            <VotingMessage
                message="Talk Voting"
                error={
                    data.talkVoting.opens
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
                        : 'Voting is not available for this conference'
                }
            />
        )
    }

    if (data.talkVoting.state === 'closed') {
        return <VotingMessage message="Talk Voting" details="Voting has closed. Thank you for participating!" />
    }

    if ('error' in data && data.error) {
        return <VotingMessage message="Talk voting" error={data.error} />
    }

    if (isLoading && pairs.length === 0) {
        return <VotingMessage message="Loading talks..." />
    }

    if (error) {
        return (
            <VotingMessage
                message="Talk Voting"
                error={error}
                cta={<Button onClick={() => void fetchBatch()}>Try Again</Button>}
            />
        )
    }

    if (currentPairIndex >= pairs.length) {
        return <VotingMessage message="Grabbing more talks!" />
    }

    const currentPair = pairs[currentPairIndex]
    if (!currentPair) {
        return null
    }

    return (
        <Container py={12} maxW="6xl">
            <VStack gap={8}>
                <VStack gap={4}>
                    <styled.h2 fontSize="2xl" color="white">
                        Which talk would you prefer to see?
                    </styled.h2>
                    <styled.p fontSize="sm" color="lightgrey">
                        Pair {overallIndex + 1} of many
                    </styled.p>
                </VStack>

                <HStack justify="center" gap={4}>
                    <Button size="lg" colorPalette="green" onClick={() => void handleVote('A')}>
                        OPTION 1
                    </Button>
                    <Button size="lg" colorPalette="blue" variant="solid" onClick={() => void handleVote('skip')}>
                        SKIP
                    </Button>
                    <Button size="lg" colorPalette="pink" onClick={() => void handleVote('B')}>
                        OPTION 2
                    </Button>
                </HStack>

                <Flex
                    gap={6}
                    direction={{ base: 'column', lg: 'row' }}
                    w="full"
                    position="relative"
                    transition="opacity 0.3s ease-out"
                >
                    {/* Left Session Card */}
                    <TalkOptionCard
                        title={currentPair.left.title}
                        description={currentPair.left.description}
                        tags={currentPair.left.tags}
                        onClick={() => void handleVote('A')}
                        highlight={voteSubmitted === 'A'}
                    />

                    {/* VS Divider */}
                    <Flex justify="center" align="center" px={4}>
                        <styled.p
                            fontSize="2xl"
                            fontWeight="bold"
                            color="white"
                            display={{ base: 'none', lg: 'block' }}
                        >
                            OR
                        </styled.p>
                    </Flex>

                    {/* Right Session Card */}
                    <TalkOptionCard
                        title={currentPair.right.title}
                        description={currentPair.right.description}
                        tags={currentPair.right.tags}
                        onClick={() => void handleVote('B')}
                        highlight={voteSubmitted === 'B'}
                    />
                </Flex>

                <HStack justify="center" gap={4}>
                    <Button
                        size="lg"
                        colorPalette="green"
                        onClick={(e) => {
                            e.currentTarget.blur()
                            window.scrollTo(0, 100)
                            void handleVote('A')
                        }}
                    >
                        OPTION 1
                    </Button>
                    <Button
                        size="lg"
                        colorPalette="blue"
                        variant="solid"
                        onClick={(e) => {
                            e.currentTarget.blur()
                            window.scrollTo(0, 100)
                            void handleVote('skip')
                        }}
                    >
                        SKIP
                    </Button>
                    <Button
                        size="lg"
                        colorPalette="pink"
                        onClick={(e) => {
                            e.currentTarget.blur()
                            window.scrollTo(0, 100)
                            void handleVote('B')
                        }}
                    >
                        OPTION 2
                    </Button>
                </HStack>
            </VStack>
        </Container>
    )
}

function VotingMessage({
    message,
    details,
    error,
    cta,
}: {
    message: string
    details?: string
    error?: string
    cta?: React.ReactNode
}) {
    return (
        <Container py={12}>
            <VStack gap={6}>
                <styled.h2 fontSize="2xl" color="white">
                    {message}
                </styled.h2>
                {error && (
                    <styled.p fontSize="lg" color="fg.muted" textAlign="center">
                        {error}
                    </styled.p>
                )}
                {details && (
                    <styled.p fontSize="lg" color="lightgrey" textAlign="center">
                        {details}
                    </styled.p>
                )}
                {cta}
            </VStack>
        </Container>
    )
}
