import type { AppLoadContext } from 'react-router'
import { getDb, type AnnouncementRow } from './d1.server'

export interface AnnouncementEntity {
    partitionKey: 'announcement'
    rowKey: string
    message: string
    createdTime: string
    updatedTime?: string
    isActive: boolean
}

export interface AnnouncementData {
    createdTime: string
    update: string
}

export async function getActiveAnnouncements(context: AppLoadContext, year: string): Promise<AnnouncementData[]> {
    try {
        const db = getDb(context)
        const result = await db
            .prepare(`SELECT * FROM announcements WHERE year = ? AND is_active = 1 ORDER BY created_time DESC`)
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
}

export async function createOrUpdateAnnouncement(
    context: AppLoadContext,
    year: string,
    message: string,
): Promise<void> {
    const db = getDb(context)
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
}

export async function clearAnnouncement(context: AppLoadContext, year: string): Promise<void> {
    const db = getDb(context)
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
}

export async function getCurrentAnnouncement(
    context: AppLoadContext,
    year: string,
): Promise<AnnouncementEntity | null> {
    try {
        const db = getDb(context)
        const row = await db
            .prepare(`SELECT * FROM announcements WHERE year = ? AND row_key = 'current'`)
            .bind(year)
            .first<AnnouncementRow>()

        if (!row) return null

        return {
            partitionKey: 'announcement',
            rowKey: row.row_key,
            message: row.message,
            createdTime: row.created_time,
            updatedTime: row.updated_time ?? undefined,
            isActive: row.is_active === 1,
        }
    } catch (error) {
        return null
    }
}
