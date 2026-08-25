import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { gridSmartSchema, sessionSchema } from '@ddd/conference-config'

/**
 * The e2e Sessionize fixtures stand in for a live API, so they're only
 * useful while they still match the shape the app parses. Validating them
 * against the same Zod schemas the real fetches use means a Sessionize
 * schema change breaks here — loudly, in unit tests — rather than showing
 * up as a confusing e2e failure.
 */
const fixtures = join(__dirname, '..', '..', 'e2e', 'fixtures', 'sessionize')
const read = (name: string) => JSON.parse(readFileSync(join(fixtures, name), 'utf8')) as unknown

describe('Sessionize e2e fixtures', () => {
    it('grid-smart.json matches gridSmartSchema', () => {
        expect(() => gridSmartSchema.parse(read('grid-smart.json'))).not.toThrow()
    })

    it('all-sessions.json matches the all-sessions shape', () => {
        const parsed = read('all-sessions.json') as Array<{ sessions: unknown[] }>
        expect(Array.isArray(parsed)).toBe(true)
        for (const session of parsed[0].sessions) {
            expect(() => sessionSchema.parse(session)).not.toThrow()
        }
    })

    it('all-sessions.json covers the sessions the voting filter must exclude', () => {
        // getSessionsForVoting drops service sessions, plenum sessions and
        // keynotes. A fixture with none of those would let a regression in
        // that filter pass unnoticed.
        const parsed = read('all-sessions.json') as Array<{
            sessions: Array<{
                isServiceSession: boolean
                isPlenumSession: boolean
                categories: Array<{ name: string; categoryItems: Array<{ name: string }> }>
            }>
        }>
        const sessions = parsed[0].sessions

        expect(sessions.some((s) => s.isServiceSession)).toBe(true)
        expect(sessions.some((s) => s.isPlenumSession)).toBe(true)
        expect(
            sessions.some((s) =>
                s.categories.some(
                    (c) => c.name === 'Session format' && c.categoryItems.some((i) => i.name === 'Keynote'),
                ),
            ),
        ).toBe(true)
    })

    it('contains no real speaker names', () => {
        // The fixtures were derived from a live response for unannounced
        // 2026 CFP submissions. Every speaker and talk title is synthetic;
        // this asserts the naming convention holds so a future regeneration
        // can't quietly reintroduce real data.
        const raw = readFileSync(join(fixtures, 'grid-smart.json'), 'utf8')
        const speakerNames = [...raw.matchAll(/"name":\s*"([^"]+)"/g)].map((m) => m[1])
        const suspicious = speakerNames.filter(
            (n) => /^[A-Z][a-z]+ [A-Z]/.test(n) && !n.startsWith('Fixture '),
        )
        // Room names ("River Room 1") are legitimately non-fixture strings.
        expect(suspicious.filter((n) => !/room|level|lv \d/i.test(n))).toEqual([])
    })
})
