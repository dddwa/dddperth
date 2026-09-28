import type { AdminSettingsSection, AdminSettingsValue } from '../admin-settings/sections'

export interface AdminSettingsEntry<S extends AdminSettingsSection> {
    value: AdminSettingsValue<S>
    updatedAt: string
    updatedBy: string
}

/**
 * Admin-editable settings, one JSON document per section of /admin/settings
 * (see `ADMIN_SETTINGS_SCHEMAS`). Values are validated against the section's
 * schema on the way in and out, so a caller only ever sees a well-formed
 * value or null.
 */
export interface AdminSettingsStore {
    /** Null when nothing has been saved for the section, or the stored value
     * no longer matches its schema. */
    get<S extends AdminSettingsSection>(section: S): Promise<AdminSettingsEntry<S> | null>
    set<S extends AdminSettingsSection>(section: S, value: AdminSettingsValue<S>, updatedBy: string): Promise<void>
    clear(section: AdminSettingsSection): Promise<void>
}
