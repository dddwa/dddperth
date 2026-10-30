import { describe, expect, it } from 'vitest'
import { projectGridSmart } from '../../e2e/fixtures/sessionize/projections'
import { type AgendaTalk, parseStoredPicks, pickTalk, talksOverlap, unpickTalk } from './my-agenda'

/**
 * Driven by the e2e Sessionize fixture rather than hand-written times, so the
 * split-slot case is tested against the same timetable the agenda renders.
 */
const talks: AgendaTalk[] = projectGridSmart()[0].rooms.flatMap((room) =>
    room.sessions.flatMap(({ id, startsAt, endsAt, isServiceSession }) =>
        !isServiceSession && startsAt && endsAt ? [{ id, startsAt, endsAt }] : [],
    ),
)
const talksById = new Map(talks.map((talk) => [talk.id, talk]))

const startingAt = (time: string) => talks.filter((talk) => talk.startsAt.slice(11, 16) === time)
const required = <T>(value: T | undefined, what: string): T => {
    if (value === undefined) throw new Error(`fixture has no ${what}`)
    return value
}
const durationMinutes = (talk: AgendaTalk) => (Date.parse(talk.endsAt) - Date.parse(talk.startsAt)) / 60_000

// The split slot: a 45-minute talk from 10:45, alongside a room running
// 10:45-11:05 and 11:10-11:30. `required` throws at collection if the fixture
// ever loses it, rather than letting the tests below run against undefined.
const longTalk = required(
    startingAt('10:45').find((talk) => durationMinutes(talk) === 45),
    '45-minute talk at 10:45',
)
const firstShort = required(
    startingAt('10:45').find((talk) => durationMinutes(talk) === 20),
    '20-minute talk at 10:45',
)
const secondShort = required(
    startingAt('11:10').find((talk) => durationMinutes(talk) === 20),
    '20-minute talk at 11:10',
)

describe('talksOverlap', () => {
    it('treats the long talk as clashing with both short talks', () => {
        expect(talksOverlap(longTalk, firstShort)).toBe(true)
        expect(talksOverlap(longTalk, secondShort)).toBe(true)
    })

    it('does not treat the two short talks as clashing', () => {
        expect(talksOverlap(firstShort, secondShort)).toBe(false)
    })

    it('lets a talk that starts when another ends sit beside it', () => {
        const a = { id: 'a', startsAt: '2026-09-20T10:00:00', endsAt: '2026-09-20T10:45:00' }
        const b = { id: 'b', startsAt: '2026-09-20T10:45:00', endsAt: '2026-09-20T11:30:00' }
        expect(talksOverlap(a, b)).toBe(false)
    })
})

describe('pickTalk', () => {
    it('keeps both short talks in a split slot', () => {
        const first = pickTalk([], firstShort, talksById)
        const second = pickTalk(first.picked, secondShort, talksById)

        expect(second.picked).toEqual([firstShort.id, secondShort.id])
        expect(second.displaced).toEqual([])
    })

    it('displaces both short talks when the long talk is picked', () => {
        const result = pickTalk([firstShort.id, secondShort.id], longTalk, talksById)

        expect(result.picked).toEqual([longTalk.id])
        expect(result.displaced).toEqual([firstShort.id, secondShort.id])
    })

    it('displaces the long talk but not the sibling when a short talk is picked', () => {
        const result = pickTalk([longTalk.id], secondShort, talksById)

        expect(result.picked).toEqual([secondShort.id])
        expect(result.displaced).toEqual([longTalk.id])
    })

    it('leaves talks in other slots alone', () => {
        const elsewhere = required(
            talks.find((talk) => !talksOverlap(talk, longTalk)),
            'talk outside the split slot',
        )
        const result = pickTalk([elsewhere.id], longTalk, talksById)

        expect(result.picked).toEqual([elsewhere.id, longTalk.id])
        expect(result.displaced).toEqual([])
    })

    it('is idempotent for a talk already picked', () => {
        const result = pickTalk([longTalk.id], longTalk, talksById)

        expect(result.picked).toEqual([longTalk.id])
        expect(result.displaced).toEqual([])
    })

    it('keeps a stale pick it cannot place rather than guessing', () => {
        // A talk withdrawn from Sessionize after being picked has no times to
        // compare; dropping it silently would lose it from the person's agenda
        // without telling them.
        const result = pickTalk(['withdrawn'], longTalk, talksById)

        expect(result.picked).toEqual(['withdrawn', longTalk.id])
    })
})

describe('unpickTalk', () => {
    it('removes only the named talk', () => {
        expect(unpickTalk([firstShort.id, secondShort.id], firstShort.id)).toEqual([secondShort.id])
    })
})

describe('parseStoredPicks', () => {
    it('reads a stored list', () => {
        expect(parseStoredPicks('["1","2"]')).toEqual(['1', '2'])
    })

    it.each([null, '', 'not json', '{"a":1}', '42', 'null'])('treats %j as nothing picked', (raw) => {
        expect(parseStoredPicks(raw)).toEqual([])
    })

    it('drops non-string entries and duplicates', () => {
        expect(parseStoredPicks('["1",2,null,"1","3"]')).toEqual(['1', '3'])
    })
})
