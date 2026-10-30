import { describe, expect, it } from 'vitest'
import { buildVolunteerRosterTable, type VolunteerRosterInput } from './volunteer-roster-table'

const talk = (title: string, rowSpan = 1, colSpan = 1) => ({ title, rowSpan, colSpan, isService: false, endLabel: '' })

const input: VolunteerRosterInput = {
    rooms: [
        { id: 'r1', name: 'Room 1' },
        { id: 'r2', name: 'Room 2' },
    ],
    slots: [
        { id: '09:00:00', label: '9:00 am', sessions: { r1: talk('Long <Workshop>', 2), r2: talk('Short talk') } },
        { id: '09:30:00', label: '9:30 am', sessions: { r2: talk('Another talk') } },
        {
            id: '10:00:00',
            label: '10:00 am',
            sessions: { r1: { title: 'Morning tea', rowSpan: 1, colSpan: 1, isService: true, endLabel: '' } },
        },
    ],
    volunteers: [
        { id: 'v1', name: 'Ada' },
        { id: 'v2', name: 'Grace' },
    ],
    assignments: [
        { slotId: '09:00:00', roomId: 'r1', role: 'room-coordinators', volunteerId: 'v1' },
        { slotId: '09:00:00', roomId: 'r1', role: 'room-coordinators', volunteerId: 'v2' },
        { slotId: '09:00:00', roomId: 'r1', role: 'photographers', volunteerId: 'v2' },
        { slotId: '09:30:00', roomId: 'r2', role: 'room-coordinators', volunteerId: 'v2' },
    ],
}

describe('buildVolunteerRosterTable', () => {
    it("lists only the given role's volunteers in the text version, grouped by slot, leaving breaks out", () => {
        const { text } = buildVolunteerRosterTable(input, 'room-coordinators')
        expect(text).toContain('9:00 am\n  Room 1 — Long <Workshop>: Ada, Grace\n  Room 2 — Short talk: —')
        expect(text).toContain('9:30 am\n  Room 2 — Another talk: Grace')
        expect(text).not.toContain('Morning tea')

        expect(buildVolunteerRosterTable(input, 'photographers').text).toContain('Long <Workshop>: Grace\n')
    })

    it('spans a long talk down the table and skips the cell it covers', () => {
        const { html } = buildVolunteerRosterTable(input, 'room-coordinators')
        expect(html).toContain(
            'rowspan="2"><em style="font-size:smaller">Long &lt;Workshop&gt;</em><br/><strong>Ada, Grace</strong>',
        )
        // 9:30 has only Room 2's cell — Room 1 is covered by the workshop.
        expect(html).toMatch(/<tr><th[^>]*>9:30 am<\/th><td[^>]*><em[^>]*>Another talk/)
        expect(html).toContain('<em style="font-size:smaller">Morning tea</em></td>')
        expect(html).not.toContain('<Workshop>')
    })

    it('spans a plenum talk across the rooms it fills and skips the cells it covers', () => {
        const { html } = buildVolunteerRosterTable(
            { ...input, slots: [{ id: '08:30:00', label: '8:30 am', sessions: { r1: talk('Keynote', 1, 2) } }] },
            'photographers',
        )
        expect(html).toMatch(
            /<tr><th[^>]*>8:30 am<\/th><td[^>]* colspan="2"><em[^>]*>Keynote<\/em><br\/><strong>—<\/strong><\/td><\/tr>/,
        )
    })
})
