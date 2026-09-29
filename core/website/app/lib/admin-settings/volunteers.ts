import { z } from 'zod'
import { VOLUNTEER_ROLES, type VolunteerRole } from '../services/volunteers-store'

/**
 * The /admin/settings/volunteers section: info links for each volunteer role
 * (role instructions, briefing docs, shot lists), any number per role. Nothing
 * in the conference config supplies these, so an unsaved install simply has
 * none.
 */

const roleIds = VOLUNTEER_ROLES.map((role) => role.id) as [VolunteerRole, ...VolunteerRole[]]

export const volunteerLinkSchema = z.object({ title: z.string().min(1), url: z.url() })
export type VolunteerLink = z.infer<typeof volunteerLinkSchema>

export const volunteerSettingsSchema = z.object({
    roleLinks: z.partialRecord(z.enum(roleIds), z.array(volunteerLinkSchema)),
})

export type VolunteerSettings = z.infer<typeof volunteerSettingsSchema>

const asText = (value: FormDataEntryValue | undefined) => (typeof value === 'string' ? value.trim() : '')

/**
 * The settings form → a value to save, or the problems with it. Each role's
 * links arrive as parallel `link.<role>.title` / `link.<role>.url` lists;
 * a row with both blank is left out, which is also how a link is removed.
 */
export function parseVolunteerSettingsForm(formData: FormData): { value: VolunteerSettings } | { errors: string[] } {
    const errors: string[] = []
    const roleLinks: VolunteerSettings['roleLinks'] = {}

    for (const role of VOLUNTEER_ROLES) {
        const titles = formData.getAll(`link.${role.id}.title`).map(asText)
        const urls = formData.getAll(`link.${role.id}.url`).map(asText)
        const links: VolunteerLink[] = []

        titles.forEach((title, i) => {
            const url = urls[i] ?? ''
            if (!title && !url) return
            const label = `${role.label} link ${i + 1}`
            if (!title) errors.push(`${label}: needs a title`)
            if (!url) errors.push(`${label}: needs a URL`)
            else if (!z.url().safeParse(url).success) errors.push(`${label}: not a valid URL`)
            else if (title) links.push({ title, url })
        })

        if (links.length) roleLinks[role.id] = links
    }

    return errors.length ? { errors } : { value: { roleLinks } }
}
