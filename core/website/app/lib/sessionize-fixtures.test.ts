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

    it('speakers.json matches speakersSchema', async () => {
        // The talk detail template resolves names, bios and photos from this
        // view. It was missing, which is why that page reached the live API.
        const { speakersSchema } = await import('./sessionize.server')
        expect(() => speakersSchema.parse(read('speakers.json'))).not.toThrow()
    })

    it('speakers.json covers every speaker the session fixtures reference', () => {
        // A referenced-but-absent speaker renders a talk page with a missing
        // byline, which is exactly the sort of gap that sends the template
        // looking at the real API.
        const sessions = read('all-sessions.json') as Array<{
            sessions: Array<{ speakers: Array<{ id: string }> }>
        }>
        const speakers = read('speakers.json') as Array<{ id: string }>
        const known = new Set(speakers.map((s) => s.id))

        const referenced = new Set(
            sessions.flatMap((g) => g.sessions.flatMap((session) => session.speakers.map((sp) => sp.id))),
        )
        expect([...referenced].filter((id) => !known.has(id))).toEqual([])
    })

    it('the pinned e2e talk id exists in the Sessions view with a speaker', async () => {
        // The talk detail route reads the `Sessions` view (getConfSessions),
        // while the agenda reads `GridSmart` — and the two fixture files have
        // entirely disjoint session ids. Pinning FIXTURE_TALK_ID to an id that
        // only exists in GridSmart 404s the detail page, which is easy to miss
        // because the agenda still looks right.
        const { FIXTURE_TALK_ID } = await import('../../e2e/routes')
        const groups = read('all-sessions.json') as Array<{
            sessions: Array<{ id: string; description: string | null; speakers: Array<{ id: string }> }>
        }>
        const session = groups.flatMap((g) => g.sessions).find((s) => s.id === FIXTURE_TALK_ID)

        expect(session, `FIXTURE_TALK_ID ${FIXTURE_TALK_ID} is not in all-sessions.json`).toBeDefined()
        expect(session?.description, 'pinned talk has no description to render').toBeTruthy()
        expect(session?.speakers.length, 'pinned talk has no speaker to render').toBeGreaterThan(0)
    })

    it('no fixture points at a live host', () => {
        // Fixtures must be self-contained: a real image or API URL would make
        // baselines depend on a third party staying online, and would leak
        // real production content into the suite.
        for (const file of ['grid-smart.json', 'all-sessions.json', 'speakers.json']) {
            const raw = readFileSync(join(fixtures, file), 'utf8')
            expect(raw, `${file} references a live host`).not.toMatch(/https?:\/\/(?!localhost|127\.0\.0\.1)/)
        }
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
