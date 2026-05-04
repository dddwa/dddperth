import type { AnnouncementRow } from '../../d1.server'
import type { AnnouncementsStore } from '../announcements-store'

export function createD1AnnouncementsStore(db: D1Database): AnnouncementsStore {
    return {
        async getActive(year) {
            try {
                const result = await db
                    .prepare(
                        `SELECT * FROM announcements WHERE year = ? AND is_active = 1 ORDER BY created_time DESC`,
                    )
                    .bind(year)
                    .all<AnnouncementRow>()

                return (result.results ?? []).map((row) => ({
                    createdTime: row.created_time,
                    update: row.message,
                }))
            } catch (error) {
                console.error('Error fetching announcements:', error)
                return []
            }
        },

        async upsert(year, message) {
            const now = new Date().toISOString()
            await db
                .prepare(
                    `INSERT INTO announcements (year, row_key, message, created_time, updated_time, is_active)
                     VALUES (?, 'current', ?, ?, ?, 1)
                     ON CONFLICT(year, row_key) DO UPDATE SET
                         message = excluded.message,
                         updated_time = excluded.updated_time,
                         is_active = 1`,
                )
                .bind(year, message, now, now)
                .run()
        },

        async clear(year) {
            const now = new Date().toISOString()
            await db
                .prepare(
                    `INSERT INTO announcements (year, row_key, message, created_time, updated_time, is_active)
                     VALUES (?, 'current', '', ?, ?, 0)
                     ON CONFLICT(year, row_key) DO UPDATE SET
                         updated_time = excluded.updated_time,
                         is_active = 0`,
                )
                .bind(year, now, now)
                .run()
        },

        async getCurrent(year) {
            try {
                const row = await db
                    .prepare(`SELECT * FROM announcements WHERE year = ? AND row_key = 'current'`)
                    .bind(year)
                    .first<AnnouncementRow>()

                if (!row) return null

                return {
                    rowKey: row.row_key,
                    message: row.message,
                    createdTime: row.created_time,
                    updatedTime: row.updated_time ?? undefined,
                    isActive: row.is_active === 1,
                }
            } catch {
                return null
            }
        },
    }
}
