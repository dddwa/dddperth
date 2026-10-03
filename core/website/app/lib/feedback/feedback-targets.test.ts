import { describe, expect, it } from 'vitest'
import { buildFeedbackTargets } from './feedback-targets'

const TZ = 'Australia/Perth'

const talk = (id: string, title: string, startsAt: string | null) => ({
    id,
    title,
    startsAt,
    room: 'Room 1',
    speakers: [{ name: 'Ada' }, { name: 'Grace' }],
})

describe('buildFeedbackTargets', () => {
    it('sorts by the clock rather than the label text, then by title', () => {
        const targets = buildFeedbackTargets(
            [
                talk('3', 'Zebra', '2026-10-03T10:30:00'),
                talk('1', 'Keynote', '2026-10-03T09:00:00'),
                talk('4', 'Apple', '2026-10-03T10:30:00'),
                talk('2', 'Afternoon', '2026-10-03T13:15:00'),
            ],
            undefined,
            TZ,
        )
        expect(targets.map((t) => t.label)).toEqual([
            '9:00 am – Keynote',
            '10:30 am – Apple',
            '10:30 am – Zebra',
            '1:15 pm – Afternoon',
        ])
        expect(targets[0]).toMatchObject({ kind: 'talk', speakers: 'Ada, Grace', room: 'Room 1' })
    })

    it('lists each Meet the Experts registrant once, at their first slot and table', () => {
        const targets = buildFeedbackTargets(
            [talk('1', 'Talk', '2026-10-03T11:00:00')],
            {
                tableLabels: ['Table A', 'Table B'],
                rows: [
                    { slotLabel: '10:30am – 11:25am', cells: [{ displayName: 'Lin', feedbackId: 'mte-1' }, null] },
                    {
                        slotLabel: '1:30pm – 2:25pm',
                        cells: [
                            { displayName: 'Sam', feedbackId: 'mte-2' },
                            { displayName: 'Lin', feedbackId: 'mte-1' },
                        ],
                    },
                ],
            },
            TZ,
        )
        expect(targets.map((t) => [t.id, t.label, t.room])).toEqual([
            ['mte-1', '10:30 am – Meet the Experts: Lin', 'Table A'],
            ['1', '11:00 am – Talk', 'Room 1'],
            ['mte-2', '1:30 pm – Meet the Experts: Sam', 'Table A'],
        ])
    })

    it('puts anything without a time last, unlabelled by time', () => {
        const targets = buildFeedbackTargets(
            [talk('1', 'Untimed', null), talk('2', 'Timed', '2026-10-03T16:00:00')],
            { tableLabels: ['T'], rows: [{ slotLabel: 'Lunch', cells: [{ displayName: 'X', feedbackId: 'mte-x' }] }] },
            TZ,
        )
        expect(targets.map((t) => t.label)).toEqual(['4:00 pm – Timed', 'Meet the Experts: X', 'Untimed'])
    })
})
