/**
 * Tests for the set backing the "In agenda" pill in the ranked talks table.
 *
 * The pill tells organizers a talk already has a home on the planner board,
 * so a talk must only count when it genuinely occupies a slot.
 */
import { describe, expect, it } from 'vitest'
import type { PlannerBoard } from '~/lib/agenda-planning-types'
import { getPlacedTalkIds } from './admin.voting_.agenda.$runId'

function board(tracks: PlannerBoard['tracks']): PlannerBoard {
    return { tracks, capacity: {} }
}

describe('getPlacedTalkIds', () => {
    it('is empty for a board with no tracks', () => {
        expect(getPlacedTalkIds(board([])).size).toBe(0)
    })

    it('is empty when every slot is unfilled', () => {
        const result = getPlacedTalkIds(
            board([
                {
                    trackId: 't1',
                    name: 'T1',
                    slots: [{ slotId: 's1', length: '45 minutes', talkId: null, kind: 'talk', label: null }],
                },
            ]),
        )
        expect(result.size).toBe(0)
    })

    it('collects placed talks across every track', () => {
        const result = getPlacedTalkIds(
            board([
                {
                    trackId: 't1',
                    name: 'T1',
                    slots: [
                        { slotId: 's1', length: '45 minutes', talkId: 'a', kind: 'talk', label: null },
                        { slotId: 's2', length: '45 minutes', talkId: null, kind: 'talk', label: null },
                    ],
                },
                {
                    trackId: 't2',
                    name: 'T2',
                    slots: [{ slotId: 's3', length: '20 minutes', talkId: 'b', kind: 'talk', label: null }],
                },
            ]),
        )
        expect([...result].sort()).toEqual(['a', 'b'])
    })

    it('does not count breaks, which never hold a talk', () => {
        const result = getPlacedTalkIds(
            board([
                {
                    trackId: 't1',
                    name: 'T1',
                    slots: [
                        { slotId: 'b1', length: '45 minutes', talkId: null, kind: 'break', label: 'Lunch' },
                        { slotId: 's1', length: '45 minutes', talkId: 'a', kind: 'talk', label: null },
                    ],
                },
            ]),
        )
        expect([...result]).toEqual(['a'])
    })
})
