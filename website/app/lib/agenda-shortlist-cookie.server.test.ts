import { describe, expect, it } from 'vitest'
import {
    newShortlistBrowserId,
    readShortlistBrowserId,
    writeShortlistCookie,
} from './agenda-shortlist-cookie.server'

const asRequest = (cookie?: string) =>
    new Request('https://example.test/', cookie ? { headers: { Cookie: cookie } } : undefined)

describe('shortlist browser-id cookie', () => {
    it('reads a well-formed id', () => {
        const id = newShortlistBrowserId()
        expect(readShortlistBrowserId(asRequest(`__shortlist=${id}`))).toBe(id)
    })

    it('returns undefined when there is no cookie header at all', () => {
        expect(readShortlistBrowserId(asRequest())).toBeUndefined()
    })

    it('finds the id alongside other cookies', () => {
        const id = newShortlistBrowserId()
        expect(readShortlistBrowserId(asRequest(`__theme=dark; __shortlist=${id}; other=x`))).toBe(id)
    })

    it('rejects a value that is not a uuid', () => {
        // The id goes straight into a primary key. An unbounded
        // attacker-supplied string would let a single client write arbitrarily
        // many distinct rows for one talk, so anything off-shape is discarded
        // and a fresh id minted instead.
        expect(readShortlistBrowserId(asRequest('__shortlist=not-a-uuid'))).toBeUndefined()
        expect(readShortlistBrowserId(asRequest(`__shortlist=${'a'.repeat(5000)}`))).toBeUndefined()
        expect(readShortlistBrowserId(asRequest("__shortlist=' OR 1=1 --"))).toBeUndefined()
    })

    it('does not confuse a cookie whose name merely ends with the same text', () => {
        const id = newShortlistBrowserId()
        expect(readShortlistBrowserId(asRequest(`not__shortlist=${id}`))).toBeUndefined()
    })

    it('mints distinct v4 uuids', () => {
        const ids = new Set(Array.from({ length: 50 }, newShortlistBrowserId))
        expect(ids.size).toBe(50)
        for (const id of ids) {
            expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
        }
    })

    it('writes an httpOnly, Secure, Lax cookie', () => {
        // httpOnly because nothing client-side needs the id — a person's own
        // picks are in localStorage, and this exists only for server-side
        // dedupe. Lax so it survives a normal navigation back to the agenda.
        const header = writeShortlistCookie(newShortlistBrowserId())

        expect(header).toContain('HttpOnly')
        expect(header).toContain('Secure')
        expect(header).toContain('SameSite=Lax')
        expect(header).toContain('Path=/')
    })

    it('round-trips a written cookie back through the reader', () => {
        const id = newShortlistBrowserId()
        const setCookie = writeShortlistCookie(id)
        // A Set-Cookie value's first pair is what the browser sends back.
        const sent = setCookie.split(';')[0]

        expect(readShortlistBrowserId(asRequest(sent))).toBe(id)
    })
})
