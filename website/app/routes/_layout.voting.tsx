import { DateTime } from 'luxon'
import { Suspense, useEffect, useState } from 'react'
import { Await, redirect, useLoaderData } from 'react-router'
import { $path } from 'safe-routes'
import { TalkOptionCard } from '~/components/TalkOptionCard'
import { Button } from '~/components/ui/button'
import { getYearConfig } from '~/lib/get-year-config.server'
import { votingStorage } from '~/lib/session.server'
import type { VotingApiResponse, VotingBatchData } from '~/lib/voting-api-types'
import { isVotingBatchResponse, isVotingErrorResponse } from '~/lib/voting-api-types'
import type { TalkPair } from '~/lib/voting.server'
import { ensureVotesTableExists, getSessionsForVoting, getVotingSession } from '~/lib/voting.server'
import { Container, Flex, HStack, styled, VStack } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.voting'

// Constants
const FETCH_TIMEOUT = 10000 // 10 seconds
const PREFETCH_THRESHOLD = 10 // Start prefetching when 10 pairs left
const CLIENT_VERSION = 'v3'

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
                votingProgress: 0,
                currentRound: 0,
                currentIndex: 0,
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
                votingProgress: 0,
                currentRound: 0,
                currentIndex: 0,
            },
            hasSession: false,
            error: 'Sessionize endpoint not configured. Please ensure the all sessions env var for the current conference year is set.',
        }
    }

    const tableClient = await ensureVotesTableExists(
        context.tableServiceClient,
        context.getTableClient,
        context.conferenceState.conference.year,
    )

    const allSessionsEndpoint = yearConfig.sessions.allSessionsEndpoint
    // This will create a session and redirect
    const votingSession = await getVotingSession(request, tableClient, () => getSessionsForVoting(allSessionsEndpoint))

    // Check if this is a V3 session, if not clear and redirect
    if (votingSession.version !== 3) {
        console.warn('Session uses old algorithm, resetting to V3 due to algorithm change')
        const votingStorageSession = await votingStorage.getSession(request.headers.get('Cookie'))
        votingStorageSession.set('sessionId', undefined)

        throw redirect($path('/voting'), {
            headers: {
                'Set-Cookie': await votingStorage.commitSession(votingStorageSession),
            },
        })
    }

    // Calculate actual voting progress based on session state
    const votingProgress = votingSession.roundNumber * votingSession.maxPairsPerRound + votingSession.currentIndex

    return {
        talkVoting: context.conferenceState.talkVoting,
        votingSession: {
            sessionId: votingSession.sessionId,
            currentRound: votingSession.roundNumber,
            currentIndex: votingSession.currentIndex,
            votingProgress,
        },
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
                        currentRound={votingSession.currentRound}
                        currentIndex={votingSession.currentIndex}
                        votingProgress={votingSession.votingProgress}
                    />
                )}
            </Await>
        </Suspense>
    )
}

function VotingPageWithSession({
    sessionId,
    currentRound,
    currentIndex,
    votingProgress,
}: {
    sessionId: string | null
    currentRound: number
    currentIndex: number
    votingProgress: number
}) {
    const data = useLoaderData<typeof loader>()

    const [pairs, setPairs] = useState<TalkPair[]>([])
    const [localIndex, setLocalIndex] = useState(0) // Index within pairs array
    const [error, setError] = useState<string | null>(null)
    const [voteSubmitted, setVoteSubmitted] = useState<'A' | 'B' | 'skip' | null>(null)
    const [isFetching, setIsFetching] = useState(false)

    // Load initial batch
    useEffect(() => {
        if (sessionId && data.talkVoting.state === 'open') {
            void loadInitialBatch(currentRound, currentIndex, isFetching, setIsFetching, setError, setPairs)
        }
    }, [sessionId, data.talkVoting.state, isFetching, currentRound, currentIndex])

    // Prefetch next batch when needed
    useEffect(() => {
        // Don't prefetch if we haven't loaded any pairs yet
        if (pairs.length === 0) return

        const remainingPairs = pairs.length - localIndex
        if (remainingPairs <= PREFETCH_THRESHOLD) {
            void loadMorePairs(pairs, isFetching, setIsFetching, setError, setPairs)
        }
    }, [localIndex, isFetching, pairs])

    async function handleVote(vote: 'A' | 'B' | 'skip') {
        const currentPair = pairs[localIndex]
        if (!currentPair) return

        // Show vote feedback
        setVoteSubmitted(vote)

        // Submit vote (fire and forget)
        void submitVote(currentPair, vote)

        // Move to next pair after animation
        setTimeout(() => {
            setLocalIndex((prev) => prev + 1)
            setVoteSubmitted(null)
        }, 300)
    }

    function handleRetry() {
        setError(null)
        if (pairs.length === 0) {
            void loadInitialBatch(currentRound, currentIndex, isFetching, setIsFetching, setError, setPairs)
        } else {
            void loadMorePairs(pairs, isFetching, setIsFetching, setError, setPairs)
        }
    }

    // Render different states
    if (data.talkVoting.state === 'not-open-yet') {
        return (
            <VotingMessage
                message="Talk Voting"
                error={
                    data.talkVoting.opens
                        ? `Voting opens ${DateTime.fromISO(data.talkVoting.opens).toLocaleString(
                              DateTime.DATETIME_SHORT,
                              { locale: 'en-AU' },
                          )} and closes ${DateTime.fromISO(data.talkVoting.closes).toLocaleString(
                              DateTime.DATETIME_SHORT,
                              { locale: 'en-AU' },
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

    if (isFetching && pairs.length === 0) {
        return <VotingMessage message="Loading talks..." />
    }

    if (error) {
        return (
            <VotingMessage message="Talk Voting" error={error} cta={<Button onClick={handleRetry}>Try Again</Button>} />
        )
    }

    if (localIndex >= pairs.length) {
        // If we've run out of pairs and not currently fetching, show loading or error
        if (error && !isFetching) {
            return (
                <VotingMessage
                    message="Failed to load more talks"
                    error={error}
                    cta={<Button onClick={handleRetry}>Retry</Button>}
                />
            )
        }

        // Otherwise, show loading
        return (
            <VotingMessage message="Whoa! You're outpacing our background talk pair loading. Hang tight while we catch up…" />
        )
    }

    const currentPair = pairs[localIndex]
    if (!currentPair) {
        return <VotingMessage message="Loading..." />
    }

    return (
        <Container py={12} maxW="6xl">
            <VStack gap={8}>
                <VStack gap={4}>
                    <styled.h2 fontSize="2xl" color="white">
                        Which talk would you prefer to see?
                    </styled.h2>
                    <styled.p fontSize="sm" color="lightgrey">
                        Pair {votingProgress + localIndex + 1} of many
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

// Helper function: Fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        })
        clearTimeout(timeoutId)
        return response
    } catch (error) {
        clearTimeout(timeoutId)
        throw error
    }
}

// Helper function: Handle redirects from server
function handleServerRedirect(response: Response): boolean {
    if (response.status === 302) {
        window.location.href = '/voting'
        return true
    }
    return false
}

// Helper function: Fetch voting batch
async function fetchVotingBatch(fromRoundNumber: number, fromIndexInRound: number): Promise<VotingBatchData> {
    const url = new URL('/api/voting/batch', window.location.origin)
    url.searchParams.set('clientVersion', CLIENT_VERSION)
    url.searchParams.set('fromRound', fromRoundNumber.toString())
    url.searchParams.set('fromIndex', fromIndexInRound.toString())

    const response = await fetchWithTimeout(url.toString(), {
        redirect: 'manual',
    })

    if (handleServerRedirect(response)) {
        throw new Error('Redirecting...')
    }

    const result: VotingApiResponse = await response.json()

    if (!response.ok) {
        if (isVotingErrorResponse(result)) {
            if (result.needsSession) {
                window.location.href = '/voting'
                throw new Error('Redirecting...')
            }
            throw new Error(result.error)
        }
        throw new Error('Failed to fetch voting batch')
    }

    if (!isVotingBatchResponse(result)) {
        throw new Error('Invalid voting batch response structure')
    }

    return result.batch
}

async function submitVote(pair: TalkPair, vote: 'A' | 'B' | 'skip'): Promise<void> {
    const formData = new FormData()
    formData.append('vote', vote)
    formData.append('roundNumber', pair.roundNumber.toString())
    formData.append('indexInRound', pair.index.toString())
    formData.append('clientVersion', CLIENT_VERSION)

    try {
        await fetchWithTimeout('/api/voting/vote', {
            method: 'POST',
            body: formData,
            redirect: 'manual',
        })
    } catch (error) {
        console.error('Failed to submit vote:', error)
        // Don't throw - vote submission is fire-and-forget
    }
}

async function loadInitialBatch(
    currentRound: number,
    currentIndex: number,
    isFetching: boolean,
    setIsFetching: (value: boolean) => void,
    setError: (error: string | null) => void,
    setPairs: (pairs: TalkPair[]) => void,
): Promise<void> {
    if (isFetching) return
    setIsFetching(true)
    setError(null)

    try {
        // For initial load, use the session state from loader
        const result = await fetchVotingBatch(currentRound, currentIndex)
        setPairs(result.pairs)
    } catch (err) {
        if (err instanceof Error && err.message !== 'Redirecting...') {
            setError(err.message)
        }
    } finally {
        setIsFetching(false)
    }
}

async function loadMorePairs(
    pairs: TalkPair[],
    isFetching: boolean,
    setIsFetching: (value: boolean) => void,
    setError: (error: string | null) => void,
    setPairs: (updater: (prev: TalkPair[]) => TalkPair[]) => void,
): Promise<void> {
    if (isFetching) return
    setIsFetching(true)
    setError(null)

    try {
        // Get the last pair to determine where to fetch from next
        const lastPair = pairs[pairs.length - 1]
        const fromRoundNumber = lastPair.roundNumber
        const fromIndexInRound = lastPair.index + 1 // Next pair after the last one

        const result = await fetchVotingBatch(fromRoundNumber, fromIndexInRound)

        if (result.pairs.length > 0) {
            // Simple append - no deduplication needed since we're loading from the end
            setPairs((prev) => [...prev, ...result.pairs])
        } else {
            setError('No talks available to vote on right now. Please try again.')
        }
    } catch (err) {
        console.error('Failed to load more pairs:', err)
        setError(err instanceof Error ? err.message : 'Failed to load more pairs')
    } finally {
        setIsFetching(false)
    }
}
