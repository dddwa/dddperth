import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { SurveyStore } from '../survey-store'
import { createD1SurveyStore } from './d1-survey-store.server'

describe('D1 survey store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: SurveyStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0033_survey_responses.sql')
        store = createD1SurveyStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('round-trips answers of every shape, and keeps every response', async () => {
        const input = {
            answers: { tracks: '2-3', topics: ['AI', 'Other'], hallway: 5 },
            others: { topics: 'Robotics' },
            email: null,
        }
        await store.saveResponse('perfect', input)
        await store.saveResponse('perfect', input)
        await store.saveResponse('other-survey', { answers: {}, others: {}, email: 'jo@example.com' })

        const rows = await store.listResponses('perfect')
        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatchObject(input)
        expect(await store.countResponses()).toEqual({ perfect: 2, 'other-survey': 1 })
    })
})
