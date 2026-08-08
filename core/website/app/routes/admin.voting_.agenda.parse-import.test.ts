/**
 * Tests for the localStorage import parser on the agenda page.
 *
 * The payload comes from whatever this code wrote into a reviewer's browser
 * months ago, so it's untrusted input that gets bound straight into SQL —
 * anything the wrong shape must be dropped rather than passed through.
 */
import { describe, expect, it } from 'vitest'
import { parseImportPayload } from './admin.voting_.agenda.$runId'

describe('parseImportPayload', () => {
    it('returns null for unparseable or non-object payloads', () => {
        expect(parseImportPayload('{oops')).toBeNull()
        expect(parseImportPayload('"a string"')).toBeNull()
        expect(parseImportPayload('null')).toBeNull()
    })

    it('keeps known statuses and drops anything else', () => {
        const result = parseImportPayload(
            JSON.stringify({ statusByTalkId: { a: 'locked', b: 'bogus', c: { evil: 1 }, d: 42 } }),
        )
        expect(result?.statusByTalkId).toEqual({ a: 'locked' })
    })

    it("keeps an empty-string status, which means 'explicitly cleared'", () => {
        expect(parseImportPayload(JSON.stringify({ statusByTalkId: { a: '' } }))?.statusByTalkId).toEqual({ a: '' })
    })

    it('keeps only correctly-typed override fields', () => {
        const result = parseImportPayload(
            JSON.stringify({ overridesByTalkId: { a: { um: 'yes', exp: true, topic: { evil: 1 } } } }),
        )
        expect(result?.overridesByTalkId).toEqual({ a: { exp: true } })
    })

    it('drops override entries that carry nothing usable', () => {
        const result = parseImportPayload(JSON.stringify({ overridesByTalkId: { a: { um: 'yes' }, b: null } }))
        expect(result?.overridesByTalkId).toEqual({})
    })

    it('drops malformed tracks, slots and capacity values', () => {
        const result = parseImportPayload(
            JSON.stringify({
                board: {
                    tracks: [
                        {
                            trackId: 't1',
                            name: 'Track 1',
                            slots: [{ slotId: 's1', length: '45 minutes', talkId: 'X' }, { slotId: 5 }, null],
                        },
                        { name: 'missing trackId' },
                        'not an object',
                    ],
                    capacity: { '45 minutes': 3, broken: 'x', alsoBroken: null },
                },
            }),
        )
        expect(result?.board?.tracks).toHaveLength(1)
        expect(result?.board?.tracks[0].slots).toEqual([{ slotId: 's1', length: '45 minutes', talkId: 'X' }])
        expect(result?.board?.capacity).toEqual({ '45 minutes': 3 })
    })

    it('coerces a non-string talkId to null rather than binding an object', () => {
        const result = parseImportPayload(
            JSON.stringify({
                board: {
                    tracks: [{ trackId: 't', name: 'n', slots: [{ slotId: 's', length: 'l', talkId: { evil: 1 } }] }],
                },
            }),
        )
        expect(result?.board?.tracks[0].slots[0].talkId).toBeNull()
    })

    it('returns empty collections for a payload with no planning in it', () => {
        expect(parseImportPayload('{}')).toEqual({
            statusByTalkId: {},
            overridesByTalkId: {},
            board: { tracks: [], capacity: {} },
        })
    })
})
