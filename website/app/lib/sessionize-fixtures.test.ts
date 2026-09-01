import { describe, expect, it } from 'vitest'
import { gridSmartSchema, sessionSchema } from '@ddd/conference-config'
import { CATEGORY_GROUPS, SPEAKERS, TALKS, speakerId } from '../../e2e/fixtures/sessionize/model'
import {
    projectAllSessions,
    projectGridSmart,
    projectSpeakers,
} from '../../e2e/fixtures/sessionize/projections'

/**
 * The e2e Sessionize fixtures are projected from a typed model
 * (`e2e/fixtures/sessionize/model.ts`) into the three views the app reads
 * (`projections.ts`), and served straight out of memory by the fixture server.
 *
 * That changes what is worth testing here. The invariants this file used to
 * assert by hand — that the three views share one id space, that every
 * referenced speaker exists, that a session's title and schedule agree across
 * views — are now properties of the projection: there is one title and one
 * start time per session, and every view reads them from the same place. Those
 * tests are gone because they can no longer fail.
 *
 * What remains is what the model can't guarantee on its own:
 *
 *  - the projected shape still satisfies the app's production Zod schemas, so
 *    a Sessionize schema change fails loudly in unit tests;
 *  - the fixture still covers the cases the app's own logic branches on;
 *  - no real speaker data crept back in.
 *
 * The views are projected here exactly as the fixture server projects them, so
 * these assertions are made against the same bytes the app is served.
 */
const gridSmart = projectGridSmart()
const allSessions = projectAllSessions()
const speakers = projectSpeakers()

const VIEWS = { gridSmart, allSessions, speakers }

describe('Sessionize e2e fixtures', () => {
    describe('the projected shape still matches the app schemas', () => {
        // These are the same schemas the live fetches parse with, so a
        // Sessionize schema change breaks here rather than showing up as a
        // confusing e2e failure.
        it('GridSmart matches gridSmartSchema', () => {
            expect(() => gridSmartSchema.parse(gridSmart)).not.toThrow()
        })

        it('Sessions matches sessionSchema', () => {
            for (const session of allSessions[0].sessions) {
                expect(() => sessionSchema.parse(session)).not.toThrow()
            }
        })

        it('Speakers matches speakersSchema', async () => {
            // The talk detail template resolves names, bios and photos from
            // this view. It was once missing entirely, which is how that page
            // ended up reaching the live API.
            const { speakersSchema } = await import('./sessionize.server')
            expect(() => speakersSchema.parse(speakers)).not.toThrow()
        })
    })

    describe('the fixture covers the cases the app branches on', () => {
        it('covers the sessions the voting filter must exclude', () => {
            // getSessionsForVoting drops service sessions, plenum sessions and
            // keynotes. A fixture with none of those would let a regression in
            // that filter pass unnoticed.
            const sessions = allSessions[0].sessions

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

        it('covers both single- and multi-speaker talks', () => {
            // The agenda and talk-detail templates both render a byline, which
            // differs for a co-presented talk.
            expect(TALKS.some((talk) => talk.speakers.length === 1)).toBe(true)
            expect(TALKS.some((talk) => talk.speakers.length > 1)).toBe(true)
        })

        it('covers both confirmed and unconfirmed talks', () => {
            expect(TALKS.some((talk) => talk.isConfirmed === false)).toBe(true)
            expect(TALKS.some((talk) => talk.isConfirmed !== false)).toBe(true)
        })

        it('the pinned e2e talk id renders fully', async () => {
            // `e2e/routes.ts` pins one talk as the talk-detail route under
            // test, and the committed visual baselines are keyed off that URL.
            // The two views can no longer disagree about whether it exists,
            // but the id itself still has to name a talk that has something to
            // render.
            const { FIXTURE_TALK_ID } = await import('../../e2e/routes')
            const talk = TALKS.find((t) => t.id === FIXTURE_TALK_ID)

            expect(talk, `FIXTURE_TALK_ID ${FIXTURE_TALK_ID} is not a talk in the fixture model`).toBeDefined()
            expect(talk?.speakers.length, 'pinned talk has no speaker to render').toBeGreaterThan(0)
        })

        it('every speaker is referenced by a talk', () => {
            // The reverse direction (a talk referencing a speaker who doesn't
            // exist) is a type error now. This catches the other kind of
            // drift: a speaker left behind by a timetable edit, which would
            // render an empty speaker page.
            const referenced = new Set(TALKS.flatMap((talk) => talk.speakers))
            expect(SPEAKERS.filter((speaker) => !referenced.has(speaker.n)).map((s) => s.n)).toEqual([])
        })
    })

    describe('the fixture data stays synthetic', () => {
        it('contains no real speaker names', () => {
            // The fixtures were derived from a live response for unannounced
            // CFP submissions. Every speaker and talk title is synthetic; this
            // asserts the naming convention holds so a future edit can't
            // quietly reintroduce real data.
            //
            // Read speaker names structurally rather than grepping every
            // `"name"` field: category names ("General Topic Category",
            // "Design Systems") also live under that key, and an allowlist big
            // enough to clear them would be wide enough to let a real name
            // through.
            const named = [
                ...gridSmart.flatMap((day) =>
                    day.rooms.flatMap((room) => room.sessions.flatMap((s) => s.speakers.map((sp) => sp.name))),
                ),
                ...allSessions.flatMap((group) =>
                    group.sessions.flatMap((s) => s.speakers.map((sp) => sp.name)),
                ),
                ...speakers.map((speaker) => speaker.fullName),
            ]

            expect(named.length, 'no speaker names found — did the fixture shape change?').toBeGreaterThan(0)
            expect(named.filter((n) => !n.startsWith('Fixture Speaker '))).toEqual([])
        })

        it('no fixture points at a live host', () => {
            // Fixtures must be self-contained: a real image or API URL would
            // make baselines depend on a third party staying online, and would
            // leak real production content into the suite.
            for (const [name, view] of Object.entries(VIEWS)) {
                expect(JSON.stringify(view), `the ${name} view references a live host`).not.toMatch(
                    /https?:\/\/(?!localhost|127\.0\.0\.1)/,
                )
            }
        })
    })

    describe('the category taxonomy is internally consistent', () => {
        it('gives every category item a unique id', () => {
            // Sessionize ids a category item once, globally. The hand-written
            // JSON repeated the taxonomy inline on every session and the
            // copies drifted: id 10 was "Keynote" on one session and "45 mins"
            // on the other 24, which is not a response the real API can
            // produce. Declaring the taxonomy once makes that unrepresentable;
            // this guards the declaration itself.
            const seen = new Map<number, string>()
            for (const group of Object.values(CATEGORY_GROUPS)) {
                for (const item of Object.values(group.items) as Array<{ id: number; name: string }>) {
                    const existing = seen.get(item.id)
                    expect(
                        existing,
                        `category item id ${item.id} is used by both "${existing}" and "${item.name}"`,
                    ).toBeUndefined()
                    seen.set(item.id, item.name)
                }
            }
        })

        it('gives every category group a unique id', () => {
            const ids = Object.values(CATEGORY_GROUPS).map((group) => group.id)
            expect(new Set(ids).size).toBe(ids.length)
        })
    })

    describe('the two GridSmart groupings agree', () => {
        it('a session is identical under its room and under its time slot', () => {
            // GridSmart returns every session twice — once grouped by room,
            // once grouped by time slot. In the hand-written fixture all 25
            // talks disagreed between the two: the time-slot copy carried
            // `categories: []` while the room copy was populated.
            //
            // The projection emits the same object in both places, so this
            // can't drift. It's asserted anyway because it's the specific bug
            // that motivated generating these files, and it's cheap.
            for (const day of gridSmart) {
                const byRoom = new Map(day.rooms.flatMap((room) => room.sessions).map((s) => [s.id, s]))

                for (const slot of day.timeSlots) {
                    for (const entry of slot.rooms) {
                        expect(
                            entry.session,
                            `session ${entry.session.id} differs between its room and its time slot`,
                        ).toEqual(byRoom.get(entry.session.id))
                    }
                }
            }
        })
    })

    describe('speaker ids', () => {
        it('are well-formed uuids', () => {
            // `speakersSchema` validates these with `z.string().uuid()`, so a
            // readable placeholder id would fail at parse time rather than
            // anywhere obvious.
            for (const { n } of SPEAKERS) {
                expect(speakerId(n)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
            }
        })
    })
})
