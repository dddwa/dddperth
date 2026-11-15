import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { EventInput, EventsStore } from '../events-store'
import { createD1EventsStore } from './d1-events-store.server'

const input: EventInput = {
    title: 'CFP info night',
    description: 'Come and hear how to write a great abstract.',
    startsAt: '2026-12-03T17:30:00.000+08:00',
    endsAt: '2026-12-03T20:00:00.000+08:00',
    location: 'Perth CBD',
    locationUrl: 'https://maps.example/perth',
    url: 'https://www.meetup.com/example',
    linkLabel: 'RSVP on Meetup',
    published: true,
}

describe('D1 events store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: EventsStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0034_events.sql')
        store = createD1EventsStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('round-trips an event, including optional fields left empty', async () => {
        const created = await store.create(input, 'admin@example.test')
        expect(await store.get(created.id)).toEqual(created)
        expect(created).toMatchObject({ ...input, slug: 'cfp-info-night', updatedBy: 'admin@example.test' })
        expect(await store.getBySlug('cfp-info-night')).toEqual(created)

        const bare = {
            ...input,
            title: 'Bare',
            endsAt: null,
            location: null,
            locationUrl: null,
            url: null,
            linkLabel: null,
            published: false,
        }
        const { id: bareId } = await store.create(bare, 'admin@example.test')
        expect(await store.get(bareId)).toMatchObject(bare)
    })

    it('lists soonest first', async () => {
        await store.create({ ...input, title: 'Later', startsAt: '2027-01-10T18:00:00.000+08:00' }, 'a@example.test')
        await store.create({ ...input, title: 'Sooner', startsAt: '2026-11-20T18:00:00.000+08:00' }, 'a@example.test')
        expect((await store.list()).map((event) => event.title)).toEqual(['Sooner', 'Later'])
    })

    it('gives a repeated title its own slug', async () => {
        const slugs = []
        for (let i = 0; i < 3; i++) slugs.push((await store.create(input, 'a@example.test')).slug)
        expect(slugs).toEqual(['cfp-info-night', 'cfp-info-night-2', 'cfp-info-night-3'])
    })

    it('updates and deletes, keeps the slug through a rename, and reports an update to a missing event', async () => {
        const { id } = await store.create(input, 'a@example.test')
        expect(await store.update(id, { ...input, title: 'Renamed', published: false }, 'b@example.test')).toBe(true)
        expect(await store.get(id)).toMatchObject({
            title: 'Renamed',
            slug: 'cfp-info-night',
            published: false,
            updatedBy: 'b@example.test',
        })

        expect(await store.update('nope', input, 'b@example.test')).toBe(false)

        await store.delete(id)
        expect(await store.get(id)).toBeNull()
        expect(await store.list()).toEqual([])
    })
})
