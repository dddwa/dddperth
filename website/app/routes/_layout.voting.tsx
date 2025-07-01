import { DateTime } from 'luxon'
import { useEffect, useRef, useState } from 'react'
import { useLoaderData } from 'react-router'
import { TalkOptionCard } from '~/components/TalkOptionCard'
import { Button } from '~/components/ui/button'
import { getYearConfig } from '~/lib/get-year-config.server'
import type { TalkPair } from '~/lib/voting.server'
import { ensureVotesTableExists, getSessionsForVoting, getVotingSession } from '~/lib/voting.server'
import { Container, Flex, HStack, styled, VStack } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.voting'

export async function loader({ request, context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'Conference cancelled this year' }), { status: 404 })
    }

    if (context.conferenceState.talkVoting.state === 'not-open-yet') {
        return {
            talkVoting: context.conferenceState.talkVoting,
            sessionId: null,
            startingIndex: 0,
            hasSession: false,
        }
    }

    // Check if Sessionize endpoint is configured
    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.allSessionsEndpoint) {
        return {
            talkVoting: context.conferenceState.talkVoting,
            sessionId: null,
            hasSession: false,
            startingIndex: 0,
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
    const votingSession = await getVotingSession(request, tableClient, sessions)

    return {
        talkVoting: context.conferenceState.talkVoting,
        sessionId: votingSession.sessionId,
        startingIndex: votingSession.currentIndex,
        hasSession: true,
    }
}

interface VotingBatch {
    batch: {
        pairs: TalkPair[]
        currentIndex: number
        totalPairs: number
        hasMore: boolean
    }
    sessionId: string
    votingState: string
}

export default function VotingPage() {
    const data = useLoaderData<typeof loader>()
    const [currentPairIndex, setCurrentPairIndex] = useState(0)
    const [overallIndex, setOverallIndex] = useState(data.startingIndex)
    const [pairs, setPairs] = useState<TalkPair[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const fetchingRef = useRef(false)
    const nextBatchFetchedRef = useRef(false)
    const [voteSubmitted, setVoteSubmitted] = useState<'A' | 'B' | 'skip' | null>(null)

    // Fetch initial batch on mount
    useEffect(() => {
        if (data.hasSession && data.sessionId) {
            void fetchBatch()
        }
    }, [data.hasSession, data.sessionId])

    // Check if we need to fetch next batch
    useEffect(() => {
        const remainingInBatch = pairs.length - currentPairIndex
        if (remainingInBatch <= 10 && remainingInBatch > 0 && !nextBatchFetchedRef.current && !fetchingRef.current) {
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
            const response = await fetch('/api/voting/batch')
            const result: VotingBatch | { error: string; needsSession?: boolean } = await response.json()

            if (!response.ok) {
                if ('needsSession' in result && result.needsSession) {
                    // Redirect to create session
                    window.location.href = '/voting'
                    return
                }
                throw new Error('error' in result ? result.error : 'Failed to fetch voting batch')
            }

            const votingBatch = result as VotingBatch
            setPairs(votingBatch.batch.pairs)
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
            const response = await fetch(`/api/voting/batch?from=${overallIndex}`)
            const result: VotingBatch | { error: string } = await response.json()

            if (response.ok && 'batch' in result) {
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
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl" color="white">
                        Talk Voting
                    </styled.h2>
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

    if ('error' in data && data.error) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl" color="white">
                        Talk Voting
                    </styled.h2>
                    <styled.p fontSize="lg" color="red.500">
                        {data.error}
                    </styled.p>
                </VStack>
            </Container>
        )
    }

    if (isLoading && pairs.length === 0) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl" color="white">
                        Loading talks...
                    </styled.h2>
                </VStack>
            </Container>
        )
    }

    if (error) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl" color="white">
                        Talk Voting
                    </styled.h2>
                    <styled.p fontSize="lg" color="red.500">
                        {error}
                    </styled.p>
                    <Button onClick={() => void fetchBatch()}>Try Again</Button>
                </VStack>
            </Container>
        )
    }

    if (currentPairIndex >= pairs.length) {
        return (
            <Container py={12}>
                <VStack gap={6}>
                    <styled.h2 fontSize="2xl" color="white">
                        Grabbing more talks!
                    </styled.h2>
                    <styled.p fontSize="lg" color="fg.muted" textAlign="center">
                        We're loading more talks to vote on...
                    </styled.p>
                </VStack>
            </Container>
        )
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
                    <styled.p fontSize="sm" color="fg.muted">
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
