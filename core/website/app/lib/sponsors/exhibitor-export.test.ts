import { describe, expect, it } from 'vitest'
import {
    buildExhibitorRow,
    buildExhibitorSheet,
    EXHIBITOR_COLUMNS,
    splitBumpSlot,
    splitTrolleyForklift,
} from './exhibitor-export'

// DDD Perth 2026 — a Saturday. Bump-in options are the Friday before.
const CONFERENCE_DATE = new Date('2026-10-03T09:00:00')

describe('splitBumpSlot', () => {
    it('splits a Friday afternoon slot into the Friday date and a 24h start time', () => {
        expect(splitBumpSlot('Friday 1pm - 2pm', CONFERENCE_DATE)).toEqual({ date: '02/10/2026', time: '13:00' })
    })

    it('resolves a Saturday slot to the conference day itself', () => {
        expect(splitBumpSlot('Saturday 4pm', CONFERENCE_DATE)).toEqual({ date: '03/10/2026', time: '16:00' })
    })

    it('handles a dotted half-hour and keeps the minutes', () => {
        expect(splitBumpSlot('Saturday 6.30am to 7am (minimal set-up only)', CONFERENCE_DATE)).toEqual({
            date: '03/10/2026',
            time: '06:30',
        })
    })

    it('handles noon, which must not become 00:00', () => {
        expect(splitBumpSlot('Friday noon - 1pm', CONFERENCE_DATE).date).toBe('02/10/2026')
        // "noon" carries no am/pm, so no time is claimed rather than a wrong one.
        expect(splitBumpSlot('Friday noon - 1pm', CONFERENCE_DATE).time).toBe('')
    })

    it('maps 12am to midnight rather than midday', () => {
        expect(splitBumpSlot('Friday 12am', CONFERENCE_DATE).time).toBe('00:00')
    })

    it('passes unparseable text through in the date column instead of dropping it', () => {
        // The committee sees their own words and can fix them, rather than the
        // venue receiving a confidently blank cell.
        expect(splitBumpSlot('During afternoon tea (room sponsors only)', CONFERENCE_DATE)).toEqual({
            date: 'During afternoon tea (room sponsors only)',
            time: '',
        })
    })

    it('is empty for an unset field', () => {
        expect(splitBumpSlot(undefined, CONFERENCE_DATE)).toEqual({ date: '', time: '' })
        expect(splitBumpSlot('   ', CONFERENCE_DATE)).toEqual({ date: '', time: '' })
    })

    it('degrades to raw text when the conference date is unknown', () => {
        expect(splitBumpSlot('Friday 1pm - 2pm', undefined)).toEqual({ date: 'Friday 1pm - 2pm', time: '' })
    })
})

describe('splitTrolleyForklift', () => {
    it('routes a trolley-only answer to the trolley column', () => {
        expect(splitTrolleyForklift('Trolley please')).toEqual({ trolley: 'Trolley please', forklift: '' })
    })

    it('routes a forklift-only answer to the forklift column', () => {
        expect(splitTrolleyForklift('Forklift required')).toEqual({ trolley: '', forklift: 'Forklift required' })
    })

    it('echoes an ambiguous answer into both, since one Jira field covers both questions', () => {
        expect(splitTrolleyForklift('Yes')).toEqual({ trolley: 'Yes', forklift: 'Yes' })
    })

    it('is empty for an unset field', () => {
        expect(splitTrolleyForklift(undefined)).toEqual({ trolley: '', forklift: '' })
    })
})

describe('buildExhibitorRow', () => {
    it('emits every column in the venue-defined order, even when unknown', () => {
        const row = buildExhibitorRow({ companyName: 'Acme Rockets' }, CONFERENCE_DATE)
        expect(row).toHaveLength(EXHIBITOR_COLUMNS.length)
        expect(row[0]).toBe('Acme Rockets')
        expect(row.slice(1).every((cell) => cell === '')).toBe(true)
    })

    it('places each known value in its venue column', () => {
        const row = buildExhibitorRow(
            {
                companyName: 'Acme Rockets',
                contactName: 'Wile E. Coyote',
                contactPhone: '0400 000 000',
                contactEmail: 'logistics@example.com',
                bumpInSlot: 'Friday 1pm - 2pm',
                bumpOutWindow: 'Saturday 4pm',
                parking: 'For Bump In',
                equipmentList: '1x banner (5kg)',
                trolleyOrForklift: 'Trolley please',
                loadingDockAssistance: 'Yes',
            },
            CONFERENCE_DATE,
        )

        expect(row).toEqual([
            'Acme Rockets',
            'Wile E. Coyote',
            '0400 000 000',
            'logistics@example.com',
            '02/10/2026',
            '13:00',
            '03/10/2026',
            '16:00',
            'For Bump In',
            '',
            '1x banner (5kg)',
            'Trolley please',
            '',
            'Yes',
            '',
        ])
    })
})

describe('buildExhibitorSheet', () => {
    const sheet = buildExhibitorSheet({
        sources: [{ companyName: 'Zeta' }, { companyName: 'Acme' }, { companyName: 'Mantel' }],
        conferenceName: 'DDD Perth',
        conferenceDate: CONFERENCE_DATE,
    })

    it('leads with the venue title row, then the headers', () => {
        expect(sheet[0][0]).toContain('Supplier & Exhibitor List')
        expect(sheet[0][0]).toContain('DDD Perth')
        expect(sheet[1]).toEqual([...EXHIBITOR_COLUMNS])
    })

    it('sorts exhibitors by name so successive exports diff cleanly', () => {
        expect(sheet.slice(2).map((row) => row[0])).toEqual(['Acme', 'Mantel', 'Zeta'])
    })

    it('emits a row per exhibitor and nothing more', () => {
        expect(sheet).toHaveLength(2 + 3)
    })

    it('omits the date from the title when the year has no conference date', () => {
        const undated = buildExhibitorSheet({
            sources: [],
            conferenceName: 'DDD Perth',
            conferenceDate: undefined,
        })
        expect(undated[0][0]).toBe('Supplier & Exhibitor List - DDD Perth')
    })
})
