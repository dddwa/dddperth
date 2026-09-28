import { ADMIN_SETTINGS_SCHEMAS } from '../../admin-settings/sections'
import type { AdminSettingsStore } from '../admin-settings-store'

interface AdminSettingsRow {
    value_json: string
    updated_at: string
    updated_by: string
}

export function createD1AdminSettingsStore(db: D1Database): AdminSettingsStore {
    return {
        async get(section) {
            const row = await db
                .prepare(`SELECT value_json, updated_at, updated_by FROM admin_settings WHERE section = ?`)
                .bind(section)
                .first<AdminSettingsRow>()
            if (!row) return null

            // A schema change can leave an old saved value unreadable. Treat
            // it as unsaved (callers fall back to config) rather than crash
            // every page that reads it.
            const parsed = ADMIN_SETTINGS_SCHEMAS[section].safeParse(JSON.parse(row.value_json))
            if (!parsed.success) {
                console.error(`Stored admin settings for "${section}" no longer match their schema`, parsed.error)
                return null
            }
            return { value: parsed.data, updatedAt: row.updated_at, updatedBy: row.updated_by }
        },

        async set(section, value, updatedBy) {
            const valueJson = JSON.stringify(ADMIN_SETTINGS_SCHEMAS[section].parse(value))
            await db
                .prepare(
                    `INSERT INTO admin_settings (section, value_json, updated_at, updated_by)
                     VALUES (?, ?, ?, ?)
                     ON CONFLICT(section) DO UPDATE SET
                         value_json = excluded.value_json,
                         updated_at = excluded.updated_at,
                         updated_by = excluded.updated_by`,
                )
                .bind(section, valueJson, new Date().toISOString(), updatedBy)
                .run()
        },

        async clear(section) {
            await db.prepare(`DELETE FROM admin_settings WHERE section = ?`).bind(section).run()
        },
    }
}
