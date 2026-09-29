import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { VolunteersStore } from '../volunteers-store'
import { createD1VolunteersStore } from './d1-volunteers-store.server'

const seat = { slotId: '09:30:00', roomId: '101', role: 'room_coordinator' } as const
const BOTH = ['room_coordinator', 'photographer'] as const

describe('D1 volunteers store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: VolunteersStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0027_volunteers.sql')
        store = createD1VolunteersStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('lists volunteers alphabetically, ignoring case, with their roles', async () => {
        await store.addVolunteer('zoe', null, ['photographer'])
        await store.addVolunteer('Alex', 'alex@example.com', [...BOTH])
        expect(await store.listVolunteers()).toMatchObject([
            { name: 'Alex', roles: [...BOTH] },
            { name: 'zoe', roles: ['photographer'] },
        ])
    })

    it('seats several people in the same role and room, and keeps years apart', async () => {
        const a = await store.addVolunteer('A', null, [...BOTH])
        const b = await store.addVolunteer('B', null, [...BOTH])

        await store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, volunteerId: b.id }, 'admin@example.com')
        await store.assign('2027', { ...seat, volunteerId: a.id }, 'admin@example.com')

        expect(await store.listAssignments('2026')).toEqual([
            { ...seat, volunteerId: a.id },
            { ...seat, volunteerId: b.id },
        ])
        expect(await store.listAssignments('2027')).toEqual([{ ...seat, volunteerId: a.id }])
    })

    it("refuses a role the volunteer doesn't hold", async () => {
        const a = await store.addVolunteer('A', null, ['photographer'])
        await expect(store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')).rejects.toThrow(
            /isn't down as a room coordinator/,
        )
    })

    it('refuses to put someone in two places in the same slot, but allows re-saving the same seat', async () => {
        const a = await store.addVolunteer('A', null, [...BOTH])
        await store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')

        await expect(
            store.assign('2026', { ...seat, role: 'photographer', volunteerId: a.id }, 'admin@example.com'),
        ).rejects.toThrow(/somewhere else/)
        await expect(store.assign('2026', { ...seat, roomId: '102', volunteerId: a.id }, 'admin@example.com')).rejects.toThrow(
            /somewhere else/,
        )

        // A different slot is fine.
        await store.assign('2026', { ...seat, slotId: '10:30:00', volunteerId: a.id }, 'admin@example.com')
        expect(await store.listAssignments('2026')).toHaveLength(2)
    })

    it("dropping a role clears that year's shifts in it, and leaves other years alone", async () => {
        const a = await store.addVolunteer('A', null, [...BOTH])
        await store.assign('2025', { ...seat, volunteerId: a.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, slotId: '10:30:00', role: 'photographer', volunteerId: a.id }, 'admin@example.com')

        await store.setVolunteerRoles(a.id, ['photographer'], '2026')

        expect((await store.listVolunteers())[0].roles).toEqual(['photographer'])
        expect(await store.listAssignments('2026')).toEqual([
            { ...seat, slotId: '10:30:00', role: 'photographer', volunteerId: a.id },
        ])
        expect(await store.listAssignments('2025')).toHaveLength(1)
    })

    it('unassigns one person from a seat, and removing a volunteer clears their shifts', async () => {
        const a = await store.addVolunteer('A', null, [...BOTH])
        const b = await store.addVolunteer('B', null, [...BOTH])
        await store.assign('2026', { ...seat, volunteerId: a.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, volunteerId: b.id }, 'admin@example.com')
        await store.assign('2026', { ...seat, slotId: '10:30:00', volunteerId: a.id }, 'admin@example.com')

        await store.unassign('2026', { ...seat, volunteerId: a.id })
        expect(await store.listAssignments('2026')).toEqual([
            { ...seat, volunteerId: b.id },
            { ...seat, slotId: '10:30:00', volunteerId: a.id },
        ])

        await store.removeVolunteer(a.id)
        expect(await store.listAssignments('2026')).toEqual([{ ...seat, volunteerId: b.id }])
    })
})
