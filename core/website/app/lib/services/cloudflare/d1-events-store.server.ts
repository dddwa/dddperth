import { eventSlug } from '../../events/event-slug'
import type { ConferenceEvent, EventInput, EventsStore } from '../events-store'

interface EventRow {
    id: string
    slug: string
    title: string
    description: string
    starts_at: string
    ends_at: string | null
    location: string | null
    location_url: string | null
    url: string | null
    link_label: string | null
    published: number
    updated_at: number
    updated_by: string
}

const COLUMNS = `id, slug, title, description, starts_at, ends_at, location, location_url, url, link_label, published, updated_at, updated_by`

function toEvent(row: EventRow): ConferenceEvent {
    return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        description: row.description,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        location: row.location,
        locationUrl: row.location_url,
        url: row.url,
        linkLabel: row.link_label,
        published: row.published === 1,
        updatedAt: row.updated_at,
        updatedBy: row.updated_by,
    }
}

function nowSeconds() {
    // eslint-disable-next-line dates/use-date-time-provider -- Operational expiry, locks, and persisted audit records must follow real time.
    return Math.floor(Date.now() / 1000)
}

export function createD1EventsStore(db: D1Database): EventsStore {
    async function slugTaken(slug: string) {
        return Boolean(await db.prepare(`SELECT 1 FROM events WHERE slug = ?`).bind(slug).first())
    }

    return {
        async list() {
            // `starts_at` is ISO in one timezone, so it sorts as text. An
            // offset change at a DST boundary could misorder two events an
            // hour apart; not worth parsing every row to avoid.
            const { results } = await db
                .prepare(`SELECT ${COLUMNS} FROM events ORDER BY starts_at, title`)
                .all<EventRow>()
            return results.map(toEvent)
        },

        async get(id) {
            const row = await db.prepare(`SELECT ${COLUMNS} FROM events WHERE id = ?`).bind(id).first<EventRow>()
            return row ? toEvent(row) : null
        },

        async getBySlug(slug) {
            const row = await db.prepare(`SELECT ${COLUMNS} FROM events WHERE slug = ?`).bind(slug).first<EventRow>()
            return row ? toEvent(row) : null
        },

        async create(input, updatedBy) {
            const id = crypto.randomUUID()
            // A second "Meetup" becomes `meetup-2`, and so on. Two admins
            // racing to create the same title would hit the UNIQUE constraint
            // rather than share a URL.
            const base = eventSlug(input.title, id)
            let slug = base
            for (let n = 2; await slugTaken(slug); n++) slug = `${base}-${n}`

            const now = nowSeconds()
            await db
                .prepare(
                    `INSERT INTO events (id, slug, title, description, starts_at, ends_at, location, location_url, url, link_label, published, created_at, updated_at, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(id, slug, ...values(input), now, now, updatedBy)
                .run()
            return { ...input, id, slug, updatedAt: now, updatedBy }
        },

        async update(id, input, updatedBy) {
            const result = await db
                .prepare(
                    `UPDATE events SET title = ?, description = ?, starts_at = ?, ends_at = ?, location = ?, location_url = ?,
                     url = ?, link_label = ?, published = ?, updated_at = ?, updated_by = ? WHERE id = ?`,
                )
                .bind(...values(input), nowSeconds(), updatedBy, id)
                .run()
            return result.meta.changes > 0
        },

        async delete(id) {
            await db.prepare(`DELETE FROM events WHERE id = ?`).bind(id).run()
        },
    }
}

function values(input: EventInput) {
    return [
        input.title,
        input.description,
        input.startsAt,
        input.endsAt,
        input.location,
        input.locationUrl,
        input.url,
        input.linkLabel,
        input.published ? 1 : 0,
    ] as const
}
