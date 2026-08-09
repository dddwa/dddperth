/**
 * Boundary tests for the D1 voting store, run against the real schema and the
 * real SQL in d1.server.ts via node:sqlite. These pin down the session
 * progression rules that decide where a returning voter resumes — the state
 * that, if it ever ran ahead of what a voter was actually shown, would make
 * the "You've seen every talk" banner appear early.
 */
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { FairPairingGeneratorV5 } from './pairing-generator-v5'
import type { AppServices } from './services/app-services'
import { createD1VotingStore } from './services/cloudflare/d1-voting-store.server'
import type { VotingStore } from './services/voting-store'
import { CURRENT_SESSION_VERSION } from './voting-version-constants'
import { recordVoteInTable } from './voting.server'

/**
 * Minimal D1Database adapter over node:sqlite. Only the surface used by
 * d1.server.ts is implemented; anything else fails loudly.
 */
function d1FromSqlite(sqlite: DatabaseSync): D1Database {
    const statementApi = (sql: string, params: Array<string | number | null>) => ({
        bind: (...args: Array<string | number | null>) => statementApi(sql, args),
        first: <T>() => Promise.resolve((sqlite.prepare(sql).get(...params) ?? null) as T | null),
        run: () => {
            const result = sqlite.prepare(sql).run(...params)
            return Promise.resolve({ meta: { changes: Number(result.changes) } })
        },
        all: <T>() => Promise.resolve({ results: sqlite.prepare(sql).all(...params) as T[] }),
    })

    return { prepare: (sql: string) => statementApi(sql, []) } as unknown as D1Database
}

const TALK_COUNT = 10 // 5 pairs per round
const SESSION_ID = 'boundary-session'
const YEAR = '2026'

function createStore(): VotingStore {
    const sqlite = new DatabaseSync(':memory:')
    sqlite.exec(readFileSync(join(import.meta.dirname, '../../migrations/0001_initial_schema.sql'), 'utf8'))
    return createD1VotingStore(d1FromSqlite(sqlite))
}

async function createSession(store: VotingStore, overrides: { roundNumber?: number; currentIndex?: number } = {}) {
    const generator = new FairPairingGeneratorV5(TALK_COUNT, 1)
    await store.createVotingSession({
        sessionId: SESSION_ID,
        year: YEAR,
        seed: 1,
        totalPairs: generator.getTotalPairs(),
        inputSessionizeTalkIdsJson: JSON.stringify(Array.from({ length: TALK_COUNT }, (_, i) => `talk-${i}`)),
        currentIndex: overrides.currentIndex ?? 0,
        version: CURRENT_SESSION_VERSION,
        roundNumber: overrides.roundNumber ?? 0,
        maxPairsPerRound: generator.getMaxPairsPerRound(),
        createdAt: '2026-07-13T00:00:00.000Z',
    })
}

function servicesFor(store: VotingStore): AppServices {
    return { voting: store } as unknown as AppServices
}

describe('session progression through recorded votes (real SQL)', () => {
    let store: VotingStore

    beforeEach(async () => {
        store = createStore()
        await createSession(store)
    })

    it('advances current_index to one past each vote, in order', async () => {
        const services = servicesFor(store)

        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 0, 'A')
        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 1, 'B')

        const session = await store.getVotingSession(SESSION_ID)
        expect(session).toMatchObject({ roundNumber: 0, currentIndex: 2 })
    })

    it('never moves the resume position backwards when votes arrive out of order', async () => {
        const services = servicesFor(store)

        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 4, 'A')
        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 1, 'B')

        const session = await store.getVotingSession(SESSION_ID)
        // The late index-1 vote is stored but must not drag the resume position back
        expect(session).toMatchObject({ roundNumber: 0, currentIndex: 5 })

        const votes = await store.getVotesForSession(SESSION_ID)
        expect(votes.map((vote) => vote.indexInRound).sort()).toEqual([1, 4])
    })

    it('keeps the first vote when the same position is voted twice', async () => {
        const services = servicesFor(store)

        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 0, 'A')
        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 0, 'B')

        const votes = await store.getVotesForSession(SESSION_ID)
        expect(votes).toHaveLength(1)
        expect(votes[0].vote).toBe('A')
    })

    it('crosses into the next round when the first next-round vote lands', async () => {
        const services = servicesFor(store)

        for (let index = 0; index < 5; index++) {
            await recordVoteInTable(services, SESSION_ID, YEAR, 0, index, 'A')
        }
        await recordVoteInTable(services, SESSION_ID, YEAR, 1, 0, 'B')

        const session = await store.getVotingSession(SESSION_ID)
        expect(session).toMatchObject({ roundNumber: 1, currentIndex: 1 })
    })

    it('ignores a stale previous-round vote arriving after the session has crossed rounds', async () => {
        const services = servicesFor(store)

        for (let index = 0; index < 5; index++) {
            await recordVoteInTable(services, SESSION_ID, YEAR, 0, index, 'A')
        }
        await recordVoteInTable(services, SESSION_ID, YEAR, 1, 0, 'B')
        // A delayed round-0 retry lands after the crossing — it must not reset the round
        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 3, 'B')

        const session = await store.getVotingSession(SESSION_ID)
        expect(session).toMatchObject({ roundNumber: 1, currentIndex: 1 })
    })

    it('rejects votes more than one round ahead without touching the session', async () => {
        const services = servicesFor(store)

        await expect(recordVoteInTable(services, SESSION_ID, YEAR, 2, 0, 'A')).rejects.toThrow(/ahead of session/)

        const session = await store.getVotingSession(SESSION_ID)
        expect(session).toMatchObject({ roundNumber: 0, currentIndex: 0 })
        expect(await store.getVotesForSession(SESSION_ID)).toHaveLength(0)
    })

    it('rejects positions at and beyond maxPairsPerRound, and negative positions', async () => {
        const services = servicesFor(store)

        await expect(recordVoteInTable(services, SESSION_ID, YEAR, 0, 5, 'A')).rejects.toThrow()
        await expect(recordVoteInTable(services, SESSION_ID, YEAR, 0, -1, 'A')).rejects.toThrow()
        await expect(recordVoteInTable(services, SESSION_ID, YEAR, -1, 0, 'A')).rejects.toThrow()

        // The last valid position of the round is accepted
        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 4, 'A')
        expect(await store.getVotesForSession(SESSION_ID)).toHaveLength(1)
    })

    /**
     * KNOWN HARDENING GAP, pinned deliberately: a single vote labelled for the
     * next round is accepted from ANY position in the current round, and jumps
     * the stored resume position past every unvoted pair in between. A voter
     * resuming after this jump would never be shown those pairs — the exact
     * shape of the "banner appeared before I saw every talk" report. The
     * legitimate client can only produce this by having already displayed the
     * next round, but a stale tab posting into a newer session (or a crafted
     * request) can do it cold. If vote submission ever gains retries or the
     * cookie can rotate mid-flight, tighten recordVoteInTable to only accept
     * round N+1 votes once round N is complete-or-nearly-complete, then update
     * this test.
     */
    it('currently allows a next-round vote to skip the remainder of the current round', async () => {
        const services = servicesFor(store)

        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 0, 'A')
        // Round-0 positions 1..4 have not been voted, yet a round-1 vote is accepted
        await recordVoteInTable(services, SESSION_ID, YEAR, 1, 3, 'B')

        const session = await store.getVotingSession(SESSION_ID)
        expect(session).toMatchObject({ roundNumber: 1, currentIndex: 4 })
    })

    it('issues strictly increasing seeds so concurrent new sessions never share a schedule', async () => {
        const seeds = [
            await store.incrementSessionCounter(YEAR),
            await store.incrementSessionCounter(YEAR),
            await store.incrementSessionCounter(YEAR),
        ]
        expect(seeds).toEqual([1, 2, 3])
    })

    it('scopes votes and progression strictly to the cookie session, even at identical positions', async () => {
        const services = servicesFor(store)
        const generator = new FairPairingGeneratorV5(TALK_COUNT, 2)
        await store.createVotingSession({
            sessionId: 'other-session',
            year: YEAR,
            seed: 2,
            totalPairs: generator.getTotalPairs(),
            inputSessionizeTalkIdsJson: JSON.stringify(Array.from({ length: TALK_COUNT }, (_, i) => `talk-${i}`)),
            currentIndex: 0,
            version: CURRENT_SESSION_VERSION,
            roundNumber: 0,
            maxPairsPerRound: generator.getMaxPairsPerRound(),
            createdAt: '2026-07-13T00:00:00.000Z',
        })

        await recordVoteInTable(services, SESSION_ID, YEAR, 0, 0, 'A')
        await recordVoteInTable(services, 'other-session', YEAR, 0, 0, 'B')

        expect((await store.getVotesForSession(SESSION_ID)).map((vote) => vote.vote)).toEqual(['A'])
        expect((await store.getVotesForSession('other-session')).map((vote) => vote.vote)).toEqual(['B'])
        expect(await store.getVotingSession('other-session')).toMatchObject({ currentIndex: 1 })
    })
})
