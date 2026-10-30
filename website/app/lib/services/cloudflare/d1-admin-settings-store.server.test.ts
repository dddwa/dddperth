import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { AdminSettingsStore } from '../admin-settings-store'
import { createD1AdminSettingsStore } from './d1-admin-settings-store.server'

const SETTINGS = {
    dueDates: { claimTicket: '2026-09-11T22:00:00.000+08:00' },
    trainingSessions: [],
    meetTheExpertsSlots: [{ id: 'slot-1', label: '10:30am' }],
}

describe('D1 admin settings store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: AdminSettingsStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0026_admin_settings.sql')
        store = createD1AdminSettingsStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('returns null until a section is saved, and again once cleared', async () => {
        expect(await store.get('speakers')).toBeNull()

        await store.set('speakers', SETTINGS, 'admin@example.com')
        expect(await store.get('speakers')).toMatchObject({ value: SETTINGS, updatedBy: 'admin@example.com' })

        await store.clear('speakers')
        expect(await store.get('speakers')).toBeNull()
    })

    it('overwrites on a second save rather than adding a row', async () => {
        await store.set('speakers', SETTINGS, 'a@example.com')
        await store.set('speakers', { ...SETTINGS, meetTheExpertsSlots: [] }, 'b@example.com')
        expect(await store.get('speakers')).toMatchObject({ value: { meetTheExpertsSlots: [] }, updatedBy: 'b@example.com' })
        expect(sqlite.prepare('SELECT COUNT(*) AS n FROM admin_settings').get()).toEqual({ n: 1 })
    })

    it('treats a stored value that no longer matches its schema as unsaved', async () => {
        sqlite
            .prepare(`INSERT INTO admin_settings (section, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?)`)
            .run('speakers', JSON.stringify({ dueDates: 'nope' }), new Date().toISOString(), 'a@example.com')
        expect(await store.get('speakers')).toBeNull()
    })
})
