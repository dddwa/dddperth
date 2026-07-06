import type { AppLoadContext } from 'react-router'
import { redirect } from 'react-router'
import { $path } from 'safe-routes'
import { FairPairingGeneratorV5 } from './pairing-generator-v5'
import type { AppServices } from './services/app-services'
import { getConfSessions } from './sessionize.server'
import type { VotingBatchData } from './voting-api-types'
import type { SessionId, TalkPair, TalkVotingData, VotingSession } from './voting-types'
import { CURRENT_SESSION_VERSION } from './voting-version-constants'

export type {
    BaseVoteRecord,
    SessionId,
    TalkPair,
    TalkVotingData,
    VoteIndex,
    VoteRecord,
    VotingGlobal,
    VotingPairs,
    VotingSession,
} from './voting-types'

export async function recordVoteInTable(
    services: AppServices,
    sessionId: SessionId,
    year: string,
    roundNumber: number,
    indexInRound: number,
    vote: 'A' | 'B' | 'skip',
): Promise<void> {
    const voteChar = vote === 'skip' ? 'S' : vote
    const session = await services.voting.getVotingSession(sessionId)

    if (!session || session.version !== CURRENT_SESSION_VERSION) {
        throw new Error(`Cannot record vote for unknown or non-V${CURRENT_SESSION_VERSION} session`)
    }

    if (roundNumber < 0 || indexInRound < 0 || indexInRound >= session.maxPairsPerRound) {
        throw new Error(
            `Invalid V${CURRENT_SESSION_VERSION} vote position: round ${roundNumber}, index ${indexInRound}`,
        )
    }

    await services.voting.recordVote({ sessionId, year, roundNumber, indexInRound, vote: voteChar })
}

export async function getVotingSession(
    request: Request,
    context: AppLoadContext,
    year: string,
    getCurrentSessions: () => Promise<TalkVotingData[]>,
): Promise<VotingSession> {
    const { services } = context
    const votingStorageSession = await services.sessions.voting.getSession(request.headers.get('Cookie'))
    const sessionId = votingStorageSession.get('sessionId')

    if (!sessionId) {
        return await createUserVotingSessionAndRedirect(request, context, year, await getCurrentSessions())
    }

    const session = await services.voting.getVotingSession(sessionId)

    if (!session || session.version !== CURRENT_SESSION_VERSION) {
        return await createUserVotingSessionAndRedirect(request, context, year, await getCurrentSessions())
    }

    return session
}

export function hasSessionsChanged(currentSessionIds: string[], storedSessionIds: string[]): boolean {
    if (currentSessionIds.length !== storedSessionIds.length) {
        return true
    }

    const sortedCurrent = [...currentSessionIds].sort()
    const sortedStored = [...storedSessionIds].sort()

    return !sortedCurrent.every((id, index) => id === sortedStored[index])
}

export function extractSessionIds(sessions: TalkVotingData[]): string[] {
    return sessions.map((session) => session.id)
}

export async function createUserVotingSessionAndRedirect(
    request: Request,
    context: AppLoadContext,
    year: string,
    currentSessions: TalkVotingData[],
): Promise<never> {
    const { services } = context
    const currentSessionIds = extractSessionIds(currentSessions)

    if (currentSessions.length === 0) {
        throw new Error('No sessions available for voting')
    }

    // V5 relies on sequential seeds to rotate matchings and early pair order.
    const sessionId = crypto.randomUUID()
    const seed = await services.voting.incrementSessionCounter(year)

    const totalTalks = currentSessions.length
    const tempGenerator = new FairPairingGeneratorV5(totalTalks, seed)
    const totalPairs = tempGenerator.getTotalPairs()
    const maxPairsPerRound = tempGenerator.getMaxPairsPerRound()

    const now = new Date().toISOString()

    await services.voting.createVotingSession({
        sessionId,
        year,
        seed,
        totalPairs,
        inputSessionizeTalkIdsJson: JSON.stringify(currentSessionIds),
        currentIndex: 0,
        version: CURRENT_SESSION_VERSION,
        roundNumber: 0,
        maxPairsPerRound,
        createdAt: now,
    })

    const votingStorageSession = await services.sessions.voting.getSession(request.headers.get('Cookie'))
    votingStorageSession.set('sessionId', sessionId)

    throw redirect($path('/voting'), {
        headers: {
            'Set-Cookie': await services.sessions.voting.commitSession(votingStorageSession),
        },
    })
}

export async function getVotingBatchExplicit(
    currentSessions: TalkVotingData[],
    votingSession: VotingSession,
    requestedRoundNumber: number,
    requestedIndexInRound: number,
    batchSize = 50,
): Promise<VotingBatchData> {
    if (votingSession.maxPairsPerRound <= 0) {
        return {
            pairs: [],
            currentIndex: requestedIndexInRound,
            newRound: false,
            exhausted: true,
        }
    }

    let pairs: TalkPair[] = []
    let roundNumber = requestedRoundNumber
    let indexInRound = requestedIndexInRound
    let pairsNeeded = batchSize
    let startedNewRound = roundNumber > votingSession.roundNumber

    while (pairsNeeded > 0) {
        const generator = new FairPairingGeneratorV5(currentSessions.length, votingSession.seed, roundNumber)

        if (generator.isRoundComplete(indexInRound)) {
            roundNumber++
            indexInRound = 0
            startedNewRound = true
            continue
        }

        const remainingInRound = votingSession.maxPairsPerRound - indexInRound
        const pairsToFetch = Math.min(pairsNeeded, remainingInRound)
        const pairsWithPositions = generator.getPairs(indexInRound, pairsToFetch)
        const newPairs = pairsWithPositions.map(({ pair: [leftIndex, rightIndex], position }) => ({
            index: position,
            roundNumber,
            left: currentSessions[leftIndex],
            right: currentSessions[rightIndex],
        }))

        if (pairsWithPositions.length > 0) {
            indexInRound = Math.max(...pairsWithPositions.map((pair) => pair.position)) + 1
        }

        pairs = pairs.concat(newPairs)
        pairsNeeded -= newPairs.length

        if (pairsNeeded <= 0) {
            break
        }

        roundNumber++
        indexInRound = 0
        startedNewRound = true
    }

    return {
        pairs,
        currentIndex: indexInRound,
        newRound: startedNewRound,
        exhausted: false,
    }
}

export async function getSessionsForVoting(allSessionsEndpoint: string) {
    const sessions = await getConfSessions({
        sessionizeEndpoint: allSessionsEndpoint,
    })

    const regularSessions: TalkVotingData[] = []
    for (const session of sessions) {
        if (!session.isServiceSession && !session.isPlenumSession) {
            regularSessions.push({
                id: session.id,
                title: session.title,
                description: session.description,
                tags: session.categories.reduce((tags, category) => {
                    if (category.name === 'General Topic Category' || category.name === 'Talk Topics') {
                        return tags.concat(category.categoryItems.map((item) => item.name))
                    }

                    return tags
                }, [] as string[]),
            })
        }
    }

    return regularSessions.sort((a, b) => a.id.localeCompare(b.id))
}
