import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { FeedbackStore } from '../feedback-store'
import { createD1FeedbackStore } from './d1-feedback-store.server'

const conference = { rating: 4, bestThing: 'The people', ideas: null, feedback: null, email: null }
const talk = { targetId: '123', rating: 5, speakerFeedback: 'Great demo', organiserFeedback: null, email: null }

describe('D1 feedback store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: FeedbackStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0029_feedback.sql')
        store = createD1FeedbackStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('keeps every conference submission, even from the same browser', async () => {
        await store.saveConferenceFeedback('2026', 'browser-a', conference)
        await store.saveConferenceFeedback('2026', 'browser-a', { ...conference, rating: 2, ideas: 'More coffee' })
        await store.saveConferenceFeedback('2026', 'browser-b', conference)

        const rows = await store.listConferenceFeedback('2026')
        expect(rows).toHaveLength(3)
        expect(rows).toContainEqual(expect.objectContaining({ rating: 2, ideas: 'More coffee' }))
    })

    it('lists the talks a browser has already reviewed, for that year only', async () => {
        await store.saveTalkFeedback('2026', 'browser-a', talk)
        await store.saveTalkFeedback('2026', 'browser-a', { ...talk, targetId: 'mte-1' })
        await store.saveTalkFeedback('2026', 'browser-b', { ...talk, targetId: '999' })
        await store.saveTalkFeedback('2027', 'browser-a', { ...talk, targetId: '777' })

        expect((await store.listTalkFeedbackTargetIds('2026', 'browser-a')).sort()).toEqual(['123', 'mte-1'])
        expect(await store.listTalkFeedbackTargetIds('2026', 'browser-c')).toEqual([])
    })

    it('refuses a second response from the same browser for the same talk, keeping the first', async () => {
        expect(await store.saveTalkFeedback('2026', 'browser-a', talk)).toBe(true)
        expect(await store.saveTalkFeedback('2026', 'browser-a', { ...talk, rating: 3 })).toBe(false)
        expect(await store.saveTalkFeedback('2026', 'browser-a', { ...talk, targetId: '456' })).toBe(true)
        expect(await store.saveTalkFeedback('2027', 'browser-a', talk)).toBe(true)

        const rows = await store.listTalkFeedback('2026')
        expect(rows.map((r) => [r.targetId, r.rating]).sort()).toEqual([
            ['123', 5],
            ['456', 5],
        ])
        expect(await store.listTalkFeedback('2027')).toHaveLength(1)
        expect(await store.listConferenceFeedback('2027')).toEqual([])
    })

    it('rejects a rating outside 1–5 at the database too', async () => {
        await expect(store.saveTalkFeedback('2026', 'browser-a', { ...talk, rating: 6 })).rejects.toThrow()
    })
})
