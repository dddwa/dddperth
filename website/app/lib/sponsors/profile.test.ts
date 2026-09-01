import { describe, expect, it } from 'vitest'
import type { SponsorProfile } from '../services/sponsors-store'
import { isProfileComplete, profileChecklist, profileDetailsSchema, socialsFromForm, validateLogoUpload } from './profile'

function profile(overrides: Partial<SponsorProfile> = {}): SponsorProfile {
    return {
        issueKey: 'SPN-1',
        blurb: 'A blurb',
        websiteUrl: 'https://example.com',
        socials: {},
        logo: { r2Key: 'k', filename: 'logo.svg', contentType: 'image/svg+xml', size: 10, uploadedAt: 1 },
        ...overrides,
    }
}

describe('isProfileComplete', () => {
    it('requires logo, blurb and website', () => {
        expect(isProfileComplete(profile())).toBe(true)
        expect(isProfileComplete(profile({ logo: undefined }))).toBe(false)
        expect(isProfileComplete(profile({ blurb: undefined }))).toBe(false)
        expect(isProfileComplete(profile({ websiteUrl: undefined }))).toBe(false)
        expect(isProfileComplete(null)).toBe(false)
    })

    it('does not require socials', () => {
        expect(isProfileComplete(profile({ socials: {} }))).toBe(true)
    })
})

describe('profileChecklist', () => {
    it('marks socials optional and done only when present', () => {
        const items = profileChecklist(profile({ socials: { linkedin: 'https://linkedin.com/x' } }))
        const socials = items.find((i) => i.key === 'socials')
        expect(socials?.required).toBe(false)
        expect(socials?.done).toBe(true)
    })

    it('handles a missing profile', () => {
        expect(profileChecklist(null).every((i) => !i.done)).toBe(true)
    })
})

describe('profileDetailsSchema', () => {
    const valid = { blurb: 'Hello', websiteUrl: 'https://example.com' }

    it('accepts a minimal valid form', () => {
        const result = profileDetailsSchema.safeParse(valid)
        expect(result.success).toBe(true)
    })

    it('rejects a missing blurb and website', () => {
        expect(profileDetailsSchema.safeParse({ blurb: ' ', websiteUrl: '' }).success).toBe(false)
    })

    it('rejects non-http(s) website URLs', () => {
        expect(profileDetailsSchema.safeParse({ ...valid, websiteUrl: 'ftp://example.com' }).success).toBe(false)
        expect(profileDetailsSchema.safeParse({ ...valid, websiteUrl: 'javascript:alert(1)' }).success).toBe(false)
    })

    it('treats empty social fields as absent but validates non-empty ones', () => {
        expect(profileDetailsSchema.safeParse({ ...valid, social_twitter: '' }).success).toBe(true)
        expect(profileDetailsSchema.safeParse({ ...valid, social_twitter: 'not a url' }).success).toBe(false)
        expect(profileDetailsSchema.safeParse({ ...valid, social_twitter: 'https://x.com/ddd' }).success).toBe(true)
    })
})

describe('socialsFromForm', () => {
    it('collects only present platforms', () => {
        expect(socialsFromForm({ social_linkedin: 'https://linkedin.com/x', social_twitter: undefined })).toEqual({
            linkedin: 'https://linkedin.com/x',
        })
    })
})

describe('validateLogoUpload', () => {
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
    const svgBytes = new TextEncoder().encode('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"></svg>')

    it('accepts matching content types', () => {
        expect(validateLogoUpload({ contentType: 'image/png', size: 8, bytes: pngBytes })).toBeNull()
        expect(validateLogoUpload({ contentType: 'image/jpeg', size: 4, bytes: jpegBytes })).toBeNull()
        expect(validateLogoUpload({ contentType: 'image/svg+xml', size: svgBytes.length, bytes: svgBytes })).toBeNull()
    })

    it('rejects disallowed content types', () => {
        expect(validateLogoUpload({ contentType: 'image/gif', size: 4, bytes: pngBytes })).toMatch(/SVG, PNG or JPEG/)
        expect(validateLogoUpload({ contentType: 'text/html', size: 4, bytes: pngBytes })).toMatch(/SVG, PNG or JPEG/)
    })

    it('rejects magic-byte mismatches (content sniffing defence)', () => {
        expect(validateLogoUpload({ contentType: 'image/png', size: 4, bytes: jpegBytes })).toMatch(/don't match/)
    })

    it('rejects non-SVG content declared as SVG', () => {
        const html = new TextEncoder().encode('<html><body>hi</body></html>')
        expect(validateLogoUpload({ contentType: 'image/svg+xml', size: html.length, bytes: html })).toMatch(
            /doesn't look like an SVG/,
        )
    })

    it('rejects oversized and empty files', () => {
        expect(validateLogoUpload({ contentType: 'image/png', size: 11 * 1024 * 1024, bytes: pngBytes })).toMatch(
            /under 10 MB/,
        )
        expect(validateLogoUpload({ contentType: 'image/png', size: 0, bytes: new Uint8Array() })).toMatch(/empty/)
    })
})
