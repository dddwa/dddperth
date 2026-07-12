import { describe, expect, it } from 'vitest'
import { isValidEmail, sanitiseRedirect } from './validation'

describe('sanitiseRedirect', () => {
    it('defaults to /admin for missing or unsafe values', () => {
        expect(sanitiseRedirect(null)).toBe('/admin')
        expect(sanitiseRedirect(undefined)).toBe('/admin')
        expect(sanitiseRedirect('')).toBe('/admin')
        expect(sanitiseRedirect('https://evil.example.com')).toBe('/admin')
        expect(sanitiseRedirect('//evil.example.com/path')).toBe('/admin')
        expect(sanitiseRedirect('admin')).toBe('/admin')
    })

    it('passes through normal paths, keeping their query strings', () => {
        expect(sanitiseRedirect('/portal')).toBe('/portal')
        expect(sanitiseRedirect('/admin/voting')).toBe('/admin/voting')
        expect(sanitiseRedirect('/agenda/2026?view=grid')).toBe('/agenda/2026?view=grid')
    })

    it('normalises React Router data-request URLs back to the page', () => {
        expect(sanitiseRedirect('/admin.data')).toBe('/admin')
        expect(sanitiseRedirect('/admin/dashboard.data')).toBe('/admin/dashboard')
        expect(sanitiseRedirect('/admin.data?_routes=routes%2Fadmin')).toBe('/admin')
        expect(sanitiseRedirect('/_root.data')).toBe('/')
    })

    it('keeps other query params while dropping _routes', () => {
        expect(sanitiseRedirect('/agenda/2026.data?_routes=x&view=grid')).toBe('/agenda/2026?view=grid')
    })
})

describe('isValidEmail', () => {
    it('accepts plausible addresses and rejects malformed ones', () => {
        expect(isValidEmail('jake@example.com')).toBe(true)
        expect(isValidEmail('a@b')).toBe(false)
        expect(isValidEmail('a b@example.com')).toBe(false)
        expect(isValidEmail('a@example.com,b@example.com')).toBe(false)
    })
})
