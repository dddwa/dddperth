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

    it('the pinned e2e talk id renders fully in both views', async () => {
        // The talk detail route reads the `Sessions` view (getConfSessions)
        // while the agenda reads `GridSmart`, and the e2e suite links from one
        // to the other — so the pinned id has to be valid in both, with content
        // to render. An id present in only one view 404s the detail page while
        // the agenda still looks correct, which is easy to miss.
        const { FIXTURE_TALK_ID } = await import('../../e2e/routes')

        const sessionsView = (read('all-sessions.json') as Array<{
            sessions: Array<{ id: string; description: string | null; speakers: Array<{ id: string }> }>
        }>)
            .flatMap((g) => g.sessions)
            .find((s) => s.id === FIXTURE_TALK_ID)

        const gridView = (read('grid-smart.json') as Array<{
            rooms: Array<{ sessions: Array<{ id: string }> }>
        }>)
            .flatMap((d) => d.rooms.flatMap((r) => r.sessions))
            .find((s) => s.id === FIXTURE_TALK_ID)

        expect(sessionsView, `FIXTURE_TALK_ID ${FIXTURE_TALK_ID} is not in all-sessions.json`).toBeDefined()
        expect(gridView, `FIXTURE_TALK_ID ${FIXTURE_TALK_ID} is not in grid-smart.json`).toBeDefined()
        expect(sessionsView?.description, 'pinned talk has no description to render').toBeTruthy()
        expect(sessionsView?.speakers.length, 'pinned talk has no speaker to render').toBeGreaterThan(0)
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
        //
        // Read speaker names structurally rather than grepping every `"name"`
        // field: category names ("General Topic Category", "Design Systems")
        // also live under that key, and an allowlist big enough to clear them
        // would be wide enough to let a real name through.
        const named: string[] = []

        for (const file of ['grid-smart.json', 'all-sessions.json']) {
            const doc = read(file) as Array<{
                rooms?: Array<{ sessions: Array<{ speakers?: Array<{ name: string }> }> }>
                sessions?: Array<{ speakers?: Array<{ name: string }> }>
            }>
            for (const group of doc) {
                const sessions = group.rooms ? group.rooms.flatMap((r) => r.sessions) : (group.sessions ?? [])
                for (const session of sessions) {
                    for (const speaker of session.speakers ?? []) named.push(speaker.name)
                }
            }
        }

        const speakers = read('speakers.json') as Array<{ firstName: string; lastName: string; fullName: string }>
        for (const speaker of speakers) named.push(speaker.fullName)

        expect(named.length, 'no speaker names found — did the fixture shape change?').toBeGreaterThan(0)
        expect(named.filter((n) => !n.startsWith('Fixture Speaker '))).toEqual([])
    })

    it('grid-smart and all-sessions describe the same sessions', () => {
        // Sessionize's GridSmart (scheduled agenda) and Sessions (submission
        // list) are two views of ONE event, so an id must mean the same talk in
        // both. They previously had entirely disjoint id spaces, which meant the
        // agenda and the talk-detail page showed unrelated talks and a talk id
        // valid in one view 404'd in the other.
        const grid = read('grid-smart.json') as Array<{
            rooms: Array<{ sessions: Array<{ id: string; title: string }> }>
        }>
        const sessionsView = read('all-sessions.json') as Array<{
            sessions: Array<{ id: string; title: string }>
        }>

        const gridById = new Map(
            grid.flatMap((d) => d.rooms.flatMap((r) => r.sessions)).map((s) => [s.id, s.title]),
        )
        const viewById = new Map(sessionsView.flatMap((g) => g.sessions).map((s) => [s.id, s.title]))

        expect([...gridById.keys()].sort()).toEqual([...viewById.keys()].sort())
        for (const [id, title] of gridById) {
            expect(viewById.get(id), `session ${id} has a different title in each view`).toBe(title)
        }
    })
})
