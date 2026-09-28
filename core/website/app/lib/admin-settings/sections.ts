import type { z } from 'zod'
import { speakerSettingsSchema } from './speakers'

/**
 * Every section of /admin/settings that stores values in the `admin_settings`
 * table, keyed by the section name used as its row key. Adding a section:
 * add its schema here, then a `admin.settings_.<section>.tsx` page and a link
 * to it from `admin.settings.tsx`.
 */
export const ADMIN_SETTINGS_SCHEMAS = {
    speakers: speakerSettingsSchema,
} satisfies Record<string, z.ZodType>

export type AdminSettingsSection = keyof typeof ADMIN_SETTINGS_SCHEMAS
export type AdminSettingsValue<S extends AdminSettingsSection> = z.infer<(typeof ADMIN_SETTINGS_SCHEMAS)[S]>
