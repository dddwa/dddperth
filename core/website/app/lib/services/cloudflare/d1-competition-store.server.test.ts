import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { emailKey } from '../../competitions/competition-entry'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { CompetitionStore } from '../competition-store'
import { createD1CompetitionStore } from './d1-competition-store.server'

const entry = (email: string, answer = 'Because') => ({ name: 'Jo', email, emailKey: emailKey(email), answer })

describe('D1 competition store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: CompetitionStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0032_competition_entries.sql')
        store = createD1CompetitionStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('refuses a second entry from the same inbox, keeping the first', async () => {
        expect(await store.saveEntry('comp', entry('jo@gmail.com', 'first'))).toBe(true)
        expect(await store.saveEntry('comp', entry('j.o+again@googlemail.com', 'second'))).toBe(false)

        expect(await store.listEntries('comp')).toEqual([
            expect.objectContaining({ email: 'jo@gmail.com', answer: 'first' }),
        ])
    })

    it('keeps competitions separate', async () => {
        expect(await store.saveEntry('comp', entry('jo@example.com'))).toBe(true)
        expect(await store.saveEntry('other', entry('jo@example.com'))).toBe(true)
        expect(await store.saveEntry('other', entry('sam@example.com'))).toBe(true)

        expect(await store.listEntries('comp')).toHaveLength(1)
        expect(await store.countEntries()).toEqual({ comp: 1, other: 2 })
    })
})
