import { describe, expect, it } from 'vitest'
import { buildScheduleEmail, buildScheduleGrid } from './meet-the-experts-schedule-email'

const input = {
    conferenceName: 'DevConf',
    slots: [
        { id: 's1', label: '10:30am' },
        { id: 's2', label: '11:30am' },
    ],
    tables: [
        { id: 't1', label: 'Table 1' },
        { id: 't2', label: 'Table 2' },
    ],
    assignments: [
        { tableId: 't1', slotId: 's1', displayName: 'Ada' },
        { tableId: 't2', slotId: 's2', displayName: 'Acme <Corp>' },
    ],
}

describe('buildScheduleGrid', () => {
    it('lays out slots as rows and tables as columns, leaving empty seats null', () => {
        expect(buildScheduleGrid(input)).toEqual({
            tableLabels: ['Table 1', 'Table 2'],
            rows: [
                { slotLabel: '10:30am', cells: ['Ada', null] },
                { slotLabel: '11:30am', cells: [null, 'Acme <Corp>'] },
            ],
        })
    })
})

describe('buildScheduleEmail', () => {
    it('lists every seat in the text version, grouped by slot', () => {
        const { text } = buildScheduleEmail(input)
        expect(text).toContain('10:30am\n  Table 1: Ada\n  Table 2: —')
        expect(text).toContain('11:30am\n  Table 1: —\n  Table 2: Acme <Corp>')
    })

    it('escapes names in the HTML table', () => {
        const { html } = buildScheduleEmail(input)
        expect(html).toContain('Acme &lt;Corp&gt;')
        expect(html).not.toContain('<Corp>')
    })
})
