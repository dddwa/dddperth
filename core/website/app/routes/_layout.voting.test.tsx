// @vitest-environment jsdom
/**
 * Client-side boundary tests for the voting page, focused on the seams that
 * decide what a voter is actually shown: the "You've seen every talk" banner
 * trigger, batch continuation positions (no gaps, no repeats), rapid-input
 * handling, and failure recovery. Pairs are supplied through a mocked fetch so
 * the tests drive the exact state machine real voters go through.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VotingBatchData, VotingBatchResponse } from '~/lib/voting-api-types'
import type { TalkPair } from '~/lib/voting.server'
import VotingPage from './_layout.voting'

const SESSION_ID = 'client-test-session'

function makePair(roundNumber: number, index: number): TalkPair {
    return {
        index,
        roundNumber,
        left: { id: `talk-L-${roundNumber}-${index}`, title: `Left r${roundNumber} #${index}`, description: null, tags: [] },
        right: {
            id: `talk-R-${roundNumber}-${index}`,
            title: `Right r${roundNumber} #${index}`,
            description: null,
            tags: [],
        },
    }
}

function batchResponse(pairs: TalkPair[], exhausted = false): VotingBatchResponse {
    const last = pairs[pairs.length - 1]
    const batch: VotingBatchData = {
        pairs,
        currentIndex: last ? last.index + 1 : 0,
        newRound: false,
        exhausted,
    }
    return { batch, sessionId: SESSION_ID, votingState: 'open' }
}

interface RecordedRequest {
    url: URL
    method: string
    body?: FormData
}

/**
 * fetch mock that answers /api/voting/batch from a queue (or a handler) and
 * always accepts /api/voting/vote, recording everything for assertions.
 */
function installFetchMock(batchHandler: (call: number, url: URL) => VotingBatchResponse | Error) {
    const requests: RecordedRequest[] = []
    let batchCalls = 0

    const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
        const url = new URL(String(input), 'http://localhost')
        const request: RecordedRequest = { url, method: init?.method ?? 'GET' }
        if (init?.body instanceof FormData) request.body = init.body
        requests.push(request)

        if (url.pathname === '/api/voting/vote') {
            return jsonResponse({ success: true, indexInRound: 0 })
        }

        if (url.pathname === '/api/voting/batch') {
            const result = batchHandler(batchCalls++, url)
            if (result instanceof Error) throw result
            return jsonResponse(result)
        }

        throw new Error(`Unexpected fetch: ${url.href}`)
    })

    vi.stubGlobal('fetch', fetchMock)
    return {
        requests,
        batchRequests: () => requests.filter((request) => request.url.pathname === '/api/voting/batch'),
        voteRequests: () => requests.filter((request) => request.url.pathname === '/api/voting/vote'),
    }
}

function jsonResponse(payload: unknown): Response {
    return {
        ok: true,
        status: 200,
        type: 'basic',
        json: () => Promise.resolve(payload),
    } as unknown as Response
}

function renderVotingPage(loader: { currentRound: number; currentIndex: number }) {
    const Stub = createRoutesStub([
        {
            path: '/voting',
            Component: VotingPage,
            loader: () => ({
                talkVoting: { state: 'open', opens: '2026-07-13T08:00:00Z', closes: '2026-07-26T23:59:59Z' },
                votingSession: {
                    sessionId: SESSION_ID,
                    currentRound: loader.currentRound,
                    currentIndex: loader.currentIndex,
                    votingProgress: 0,
                    totalPairs: 5,
                },
                votingSponsors: [],
            }),
        },
    ])
    return render(<Stub initialEntries={['/voting']} />)
}

const BANNER_TEXT = /You've seen every talk now/

async function currentPairShown(pair: TalkPair) {
    await waitFor(() => {
        expect(screen.getByText(pair.left.title)).toBeDefined()
        expect(screen.getByText(pair.right.title)).toBeDefined()
    })
}

/** Vote on the currently shown pair and wait for the advance animation. */
async function voteOnce(button: 'OPTION 1' | 'OPTION 2' | 'SKIP' = 'OPTION 1') {
    fireEvent.click(screen.getAllByRole('button', { name: button })[0])
    await act(() => new Promise((resolve) => setTimeout(resolve, 250)))
}

beforeEach(() => {
    vi.stubGlobal('scrollTo', vi.fn())
})

afterEach(() => {
    cleanup() // vitest runs with globals:false, so RTL's automatic cleanup never registers
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('the "seen every talk" banner boundary', () => {
    it('stays hidden through the final round-0 pair and appears exactly on the first round-1 pair', async () => {
        const pairs = [makePair(0, 3), makePair(0, 4), makePair(1, 0), makePair(1, 1)]
        installFetchMock(() => batchResponse(pairs))

        renderVotingPage({ currentRound: 0, currentIndex: 3 })

        await currentPairShown(pairs[0])
        expect(screen.queryByText(BANNER_TEXT)).toBeNull()

        await voteOnce()
        await currentPairShown(pairs[1]) // final round-0 pair
        expect(screen.queryByText(BANNER_TEXT)).toBeNull()

        await voteOnce()
        await currentPairShown(pairs[2]) // first round-1 pair
        expect(screen.getByText(BANNER_TEXT)).toBeDefined()
    })

    it('shows the banner immediately when resuming a session already in round 1', async () => {
        const pairs = [makePair(1, 5), makePair(1, 6)]
        installFetchMock(() => batchResponse(pairs))

        renderVotingPage({ currentRound: 1, currentIndex: 5 })

        await currentPairShown(pairs[0])
        expect(screen.getByText(BANNER_TEXT)).toBeDefined()
    })
})

describe('vote submission boundaries', () => {
    it('submits exactly the displayed pair position, including across the round crossing', async () => {
        const pairs = [makePair(0, 4), makePair(1, 0), makePair(1, 1)]
        const mock = installFetchMock(() => batchResponse(pairs))

        renderVotingPage({ currentRound: 0, currentIndex: 4 })
        await currentPairShown(pairs[0])

        await voteOnce('OPTION 1')
        await currentPairShown(pairs[1])
        await voteOnce('SKIP')
        await currentPairShown(pairs[2])

        const submitted = mock.voteRequests().map((request) => ({
            vote: request.body?.get('vote'),
            roundNumber: request.body?.get('roundNumber'),
            indexInRound: request.body?.get('indexInRound'),
        }))
        expect(submitted).toEqual([
            { vote: 'A', roundNumber: '0', indexInRound: '4' },
            { vote: 'skip', roundNumber: '1', indexInRound: '0' },
        ])
    })

    it('ignores rapid extra clicks so no pair is skipped and no double vote is sent', async () => {
        const pairs = [makePair(0, 0), makePair(0, 1), makePair(0, 2)]
        const mock = installFetchMock(() => batchResponse(pairs))

        renderVotingPage({ currentRound: 0, currentIndex: 0 })
        await currentPairShown(pairs[0])

        // Two clicks in quick succession — the second (on a different answer!)
        // lands during the 200ms advance window and must be swallowed
        fireEvent.click(screen.getAllByRole('button', { name: 'OPTION 1' })[0])
        fireEvent.click(screen.getAllByRole('button', { name: 'OPTION 2' })[0])
        await act(() => new Promise((resolve) => setTimeout(resolve, 250)))

        // Advanced exactly one pair, not two
        await currentPairShown(pairs[1])
        expect(screen.queryByText(pairs[2].left.title)).toBeNull()

        expect(
            mock.voteRequests().map((request) => [request.body?.get('vote'), request.body?.get('indexInRound')]),
        ).toEqual([['A', '0']])
    })
})

describe('batch continuation boundaries', () => {
    it('prefetches from exactly one past the last loaded pair — no gap, no overlap', async () => {
        // 12 pairs: prefetch threshold (10 remaining) is crossed after the second vote
        const initial = Array.from({ length: 12 }, (_, index) => makePair(0, index))
        const next = [makePair(0, 12), makePair(0, 13)]
        const mock = installFetchMock((call) => (call === 0 ? batchResponse(initial) : batchResponse(next)))

        renderVotingPage({ currentRound: 0, currentIndex: 0 })
        await currentPairShown(initial[0])

        await voteOnce()
        await voteOnce()

        await waitFor(() => expect(mock.batchRequests()).toHaveLength(2))
        const prefetch = mock.batchRequests()[1].url
        expect(prefetch.searchParams.get('fromRound')).toBe('0')
        expect(prefetch.searchParams.get('fromIndex')).toBe('12')
    })

    it('recovers from a failed prefetch by refetching from the last loaded pair, not the current one', async () => {
        const initial = Array.from({ length: 11 }, (_, index) => makePair(0, index))
        const recovery = [makePair(0, 11)]
        const mock = installFetchMock((call) => {
            if (call === 0) return batchResponse(initial)
            if (call === 1) return new Error('network down')
            return batchResponse(recovery)
        })

        renderVotingPage({ currentRound: 0, currentIndex: 0 })
        await currentPairShown(initial[0])

        // First vote leaves 10 remaining -> prefetch fires and fails silently
        await voteOnce()
        await waitFor(() => expect(mock.batchRequests()).toHaveLength(2))

        // Voting continues uninterrupted through everything already loaded
        for (let index = 1; index < 11; index++) {
            await currentPairShown(initial[index])
            await voteOnce()
        }

        // Only at the end of loaded pairs does the failure surface, with a retry
        const retry = await screen.findByRole('button', { name: /Try Again/i })
        fireEvent.click(retry)

        await waitFor(() => expect(mock.batchRequests()).toHaveLength(3))
        const retried = mock.batchRequests()[2].url
        expect(retried.searchParams.get('fromRound')).toBe('0')
        expect(retried.searchParams.get('fromIndex')).toBe('11')

        await currentPairShown(recovery[0])
    })

    it('shows the end-of-comparisons message when the server reports exhausted', async () => {
        const pairs = [makePair(0, 0)]
        installFetchMock((call) => (call === 0 ? batchResponse(pairs) : batchResponse([], true)))

        renderVotingPage({ currentRound: 0, currentIndex: 0 })
        await currentPairShown(pairs[0])

        await voteOnce()

        await screen.findByText(/No more talk comparisons are available right now/)
    })
})
