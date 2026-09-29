import type { z } from 'zod'
import {
    ADMIN_SETTINGS_SCHEMAS,
    type AdminSettingsSection,
    type AdminSettingsValue,
} from '../../admin-settings/sections'
import type { AdminSettingsStore } from '../admin-settings-store'

/** Indexing the schema map with a generic key widens to a union of every
 * section's schema; this pins it back to the one section asked for. */
function schemaFor<S extends AdminSettingsSection>(section: S): z.ZodType<AdminSettingsValue<S>> {
    return ADMIN_SETTINGS_SCHEMAS[section] as unknown as z.ZodType<AdminSettingsValue<S>>
}

interface AdminSettingsRow {
    value_json: string
    updated_at: string
    updated_by: string
}

export function createD1AdminSettingsStore(db: D1Database): AdminSettingsStore {
    return {
        async get<S extends AdminSettingsSection>(section: S) {
            const row = await db
                .prepare(`SELECT value_json, updated_at, updated_by FROM admin_settings WHERE section = ?`)
                .bind(section)
                .first<AdminSettingsRow>()
            if (!row) return null

            // A schema change can leave an old saved value unreadable. Treat
            // it as unsaved (callers fall back to config) rather than crash
            // every page that reads it.
            const parsed = schemaFor(section).safeParse(JSON.parse(row.value_json))
            if (!parsed.success) {
                console.error(`Stored admin settings for "${section}" no longer match their schema`, parsed.error)
                return null
            }
            return { value: parsed.data, updatedAt: row.updated_at, updatedBy: row.updated_by }
        },

        async set(section, value, updatedBy) {
            const valueJson = JSON.stringify(schemaFor(section).parse(value))
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
