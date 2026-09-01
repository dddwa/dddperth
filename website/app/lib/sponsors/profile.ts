import { z } from 'zod'
import type { SponsorProfile } from '../services/sponsors-store'

/**
 * Pure profile rules shared by the portal routes, the dashboard checklist
 * and the write-back trigger. No platform imports — unit-testable in node.
 */

export const SOCIAL_PLATFORMS = [
    { key: 'linkedin', label: 'LinkedIn' },
    { key: 'twitter', label: 'X (Twitter)' },
    { key: 'instagram', label: 'Instagram' },
    { key: 'facebook', label: 'Facebook' },
    { key: 'youtube', label: 'YouTube' },
] as const

export type SocialPlatformKey = (typeof SOCIAL_PLATFORMS)[number]['key']

const optionalUrl = z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.url({ protocol: /^https?$/, error: 'Enter a full URL, including https://' }).max(500).optional(),
)

/** The "save details" form. Social fields are named `social_<platform>`. */
export const profileDetailsSchema = z.object({
    blurb: z
        .string()
        .trim()
        .min(1, 'Add a short blurb — a sentence or two about your company')
        .max(1000, 'Keep the blurb under 1000 characters'),
    websiteUrl: z
        .string()
        .trim()
        .min(1, 'Add your website URL')
        .pipe(z.url({ protocol: /^https?$/, error: 'Enter a full URL, including https://' }).max(500)),
    social_linkedin: optionalUrl,
    social_twitter: optionalUrl,
    social_instagram: optionalUrl,
    social_facebook: optionalUrl,
    social_youtube: optionalUrl,
})

/** Extracts the socials map from a parsed profileDetailsSchema value. */
export function socialsFromForm(data: Record<string, unknown>): Record<string, string> {
    const socials: Record<string, string> = {}
    for (const platform of SOCIAL_PLATFORMS) {
        const value = data[`social_${platform.key}`]
        if (typeof value === 'string' && value) socials[platform.key] = value
    }
    return socials
}

/**
 * Phase 1 completion = logo + blurb + website. Socials are optional —
 * this mirrors what the public site renders for a sponsor (logo, link,
 * optional quote). Completing flips the Jira "Assets for Conference" task.
 */
export function isProfileComplete(profile: SponsorProfile | null): boolean {
    if (!profile) return false
    return Boolean(profile.logo && profile.blurb && profile.websiteUrl)
}

export interface ChecklistItem {
    key: 'logo' | 'blurb' | 'website' | 'socials'
    label: string
    done: boolean
    required: boolean
}

export function profileChecklist(profile: SponsorProfile | null): ChecklistItem[] {
    return [
        { key: 'logo', label: 'Company logo uploaded', done: Boolean(profile?.logo), required: true },
        { key: 'blurb', label: 'Company blurb / quote', done: Boolean(profile?.blurb), required: true },
        { key: 'website', label: 'Website URL', done: Boolean(profile?.websiteUrl), required: true },
        {
            key: 'socials',
            label: 'Social media links',
            done: Object.keys(profile?.socials ?? {}).length > 0,
            required: false,
        },
    ]
}

/** Upload constraints for the logo file. */
export const LOGO_MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const LOGO_TYPES: Record<string, { extensions: string[]; magic?: number[][] }> = {
    'image/svg+xml': { extensions: ['svg'] },
    'image/png': { extensions: ['png'], magic: [[0x89, 0x50, 0x4e, 0x47]] },
    'image/jpeg': { extensions: ['jpg', 'jpeg'], magic: [[0xff, 0xd8, 0xff]] },
}

export function logoExtensionForContentType(contentType: string): string | null {
    return LOGO_TYPES[contentType]?.extensions[0] ?? null
}

/**
 * Validates an uploaded logo: declared content type on the allowlist, size
 * within bounds, and (for raster formats) magic bytes matching the declared
 * type. SVG has no magic signature — it gets a cheap "looks like svg" sniff.
 * Returns an error message, or null when the file is acceptable.
 */
export function validateLogoUpload(args: { contentType: string; size: number; bytes: Uint8Array }): string | null {
    const { contentType, size, bytes } = args

    const spec = LOGO_TYPES[contentType]
    if (!spec) return 'Upload an SVG, PNG or JPEG file'
    if (size > LOGO_MAX_BYTES) return 'Logo must be under 10 MB'
    if (size === 0) return 'The uploaded file is empty'

    if (spec.magic) {
        const matches = spec.magic.some((sig) => sig.every((byte, i) => bytes[i] === byte))
        if (!matches) return "The file contents don't match its type — re-export it and try again"
    } else {
        // SVG: must contain an <svg tag near the start (allowing xml prolog,
        // doctype, comments and whitespace).
        const head = new TextDecoder().decode(bytes.slice(0, 4096)).toLowerCase()
        if (!head.includes('<svg')) return "The file doesn't look like an SVG — re-export it and try again"
    }

    return null
}
