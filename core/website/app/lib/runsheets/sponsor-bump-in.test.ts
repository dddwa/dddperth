import { conferenceManifest } from '@conference/manifest'
import type { RunsheetsBumpInConfig } from '@ddd/conference-config'
import { describe, expect, it } from 'vitest'
import { BUMP_IN_SLOTS } from '../sponsors/logistics'
import { mapSponsorBumpIn, publicFreeText, sortByStartTime, type SponsorIssue } from './sponsor-bump-in.server'

const sponsors: RunsheetsBumpInConfig['sponsors'] = {
    jql: 'project = SPN',
    fields: {
        companyName: 'cf_company',
        tier: 'cf_tier',
        bumpInSlot: 'cf_slot',
        underStadiumDropOff: 'cf_ring_road',
        trolley: 'cf_trolley',
        loadingDockAssistance: 'cf_dock',
        porterAssistance: 'cf_porter',
        exhibitorRoom: 'cf_room',
        exhibitorSpaceNumber: 'cf_space',
    },
    underStadiumBumpInOption: 'For Bump In',
    slots: {
        'Friday 2pm - 3pm': {
            start: '2026-10-02T14:00:00+08:00',
            end: '2026-10-02T15:00:00+08:00',
            team: 'team-Fri-Bump-In',
        },
    },
    exhibitingTiers: ['Platinum', 'Gold'],
}
const teamLabels = { 'team-Fri-Bump-In': 'Friday Bump In' }

function issue(id: string, fields: Record<string, unknown>): SponsorIssue {
    return { id, fields }
}

describe('mapSponsorBumpIn', () => {
    it('builds a timed row from the chosen slot', () => {
        const [row] = mapSponsorBumpIn(
            [
                issue('1', {
                    cf_company: 'Bankwest',
                    cf_tier: { value: 'Platinum' },
                    cf_slot: { value: 'Friday 2pm - 3pm' },
                    cf_ring_road: [{ value: 'For Bump In' }, { value: 'For Bump Out' }],
                    cf_trolley: 'Trolley required',
                    cf_dock: 'No',
                    cf_porter: 'Yes',
                    cf_room: { value: 'Champions Terrace' },
                    cf_space: '12',
                }),
            ],
            sponsors,
            teamLabels,
        )

        expect(row).toEqual({
            id: 'sponsor-1',
            summary: 'Exhibitor - Bankwest',
            startTime: '2026-10-02T14:00:00+08:00',
            endTime: '2026-10-02T15:00:00+08:00',
            locations: ['Champions Terrace', 'Space 12'],
            teams: ['Friday Bump In'],
            roleInstructionsUrl: null,
            exhibitor: {
                tier: 'Platinum',
                slot: 'Friday 2pm - 3pm',
                ringRoad: true,
                trolley: 'Trolley required',
                loadingDockAssistance: null,
                porterAssistance: 'Yes',
            },
        })
    })

    it('only flags the ring road when it is needed for bump-in', () => {
        const [row] = mapSponsorBumpIn(
            [
                issue('1', {
                    cf_company: 'Acme',
                    cf_slot: { value: 'Friday 2pm - 3pm' },
                    cf_ring_road: [{ value: 'For Bump Out' }],
                }),
            ],
            sponsors,
            teamLabels,
        )
        expect(row?.exhibitor?.ringRoad).toBe(false)
    })

    it('keeps an exhibiting sponsor with no slot, untimed, so the gap shows', () => {
        const rows = mapSponsorBumpIn(
            [issue('1', { cf_company: 'Mantel', cf_tier: { value: 'Gold' } })],
            sponsors,
            teamLabels,
        )
        expect(rows).toHaveLength(1)
        expect(rows[0]?.startTime).toBeNull()
        expect(rows[0]?.teams).toEqual([])
    })

    it('leaves out non-exhibiting sponsors with no slot', () => {
        expect(
            mapSponsorBumpIn([issue('1', { cf_company: 'AFG', cf_tier: { value: 'Digital' } })], sponsors, teamLabels),
        ).toEqual([])
    })

    it('leaves out a sponsor with no company name rather than guessing one', () => {
        expect(
            mapSponsorBumpIn(
                [issue('1', { cf_tier: { value: 'Gold' }, cf_slot: { value: 'Friday 2pm - 3pm' } })],
                sponsors,
                teamLabels,
            ),
        ).toEqual([])
    })

    it('shows a slot missing from config as untimed, not dropped', () => {
        const [row] = mapSponsorBumpIn(
            [issue('1', { cf_company: 'X', cf_slot: { value: 'Friday 9pm' } })],
            sponsors,
            teamLabels,
        )
        expect(row?.startTime).toBeNull()
        expect(row?.exhibitor?.slot).toBe('Friday 9pm')
    })

    it('never reads a field outside the allowlist, even if Jira sends one', () => {
        // Jira only returns requested fields, but if a response ever carried
        // more, nothing but the mapped fields may reach the row.
        const [row] = mapSponsorBumpIn(
            [
                issue('1', {
                    cf_company: 'Bankwest',
                    cf_slot: { value: 'Friday 2pm - 3pm' },
                    summary: 'Bankwest - Platinum - $20k - paid',
                    customfield_10149: 'Kathy Example',
                    customfield_10150: '0400 000 000',
                }),
            ],
            sponsors,
            teamLabels,
        )
        const serialised = JSON.stringify(row)
        expect(serialised).not.toContain('$20k')
        expect(serialised).not.toContain('Kathy')
        expect(serialised).not.toContain('0400')
    })

    it('renders a field whose Jira type changed as blank, not as an object dump', () => {
        const [row] = mapSponsorBumpIn(
            [
                issue('1', {
                    cf_company: 'X',
                    cf_slot: { value: 'Friday 2pm - 3pm' },
                    cf_trolley: { value: 'Yes', id: '1' },
                }),
            ],
            sponsors,
            teamLabels,
        )
        expect(row?.exhibitor?.trolley).toBeNull()
    })
})

describe('publicFreeText', () => {
    it('strips emails and phone numbers a sponsor typed in', () => {
        expect(publicFreeText('Trolley - call Kathy on 0407 937 537 or kathy@example.com')).toBe(
            'Trolley - call Kathy on or',
        )
        expect(publicFreeText('+61 8 9000 0000')).toBeNull()
    })

    it('keeps small numbers that are part of the answer', () => {
        expect(publicFreeText('2 trolleys, 3 crates')).toBe('2 trolleys, 3 crates')
    })

    it('treats "nothing needed" answers as empty', () => {
        for (const answer of ['No', 'no', 'N/A', 'n/a', 'none', 'Not required', '-', '  ']) {
            expect(publicFreeText(answer)).toBeNull()
        }
    })

    it('ignores non-strings', () => {
        expect(publicFreeText(null)).toBeNull()
        expect(publicFreeText({ value: 'x' })).toBeNull()
    })
})

describe('sortByStartTime', () => {
    it("orders Jira's +0800 and config's +08:00 by instant, untimed last", () => {
        const sorted = sortByStartTime([
            { summary: 'untimed', startTime: null },
            { summary: 'config 2pm', startTime: '2026-10-02T14:00:00+08:00' },
            { summary: 'jira 1pm', startTime: '2026-10-02T13:00:00.000+0800' },
            { summary: 'saturday', startTime: '2026-10-03T06:30:00+08:00' },
        ])
        expect(sorted.map((item) => item.summary)).toEqual(['jira 1pm', 'config 2pm', 'saturday', 'untimed'])
    })
})

describe("this fork's bump-in config", () => {
    const bumpIn = conferenceManifest.runsheets?.bumpIn
    const portalFields = conferenceManifest.sponsorPortal?.jira.fields

    it.runIf(bumpIn && portalFields)('requests no private sponsor field', () => {
        if (!bumpIn || !portalFields) return
        const logistics = portalFields.logistics ?? {}
        // Contact details, attendee lists, links and anything the committee
        // uses privately. If a field here needs to go on the public page,
        // that's a decision to make deliberately, not by editing config.
        const privateFieldIds = [
            portalFields.contactEmail,
            portalFields.additionalContactEmails,
            portalFields.ticketClaimUrl,
            portalFields.assetUploadUrl,
            portalFields.freeTicketCount,
            logistics.exhibitorContactName,
            logistics.exhibitorContactPhone,
            logistics.exhibitorContactEmail,
            logistics.bumpInAttendees,
            logistics.loadingDockAttendees,
            logistics.equipmentList,
            logistics.nonLaptopElectrical,
            logistics.screenInvoicingEmail,
            'summary',
            'description',
            'reporter',
            'assignee',
        ].filter((id): id is string => typeof id === 'string')

        const requested = Object.values(bumpIn.sponsors.fields)
        for (const id of privateFieldIds) {
            expect(requested).not.toContain(id)
        }
    })

    it.runIf(bumpIn)('times every bump-in slot the sponsor portal offers', () => {
        if (!bumpIn) return
        for (const slot of BUMP_IN_SLOTS) {
            expect(Object.keys(bumpIn.sponsors.slots)).toContain(slot)
        }
    })

    it.runIf(bumpIn)('names a known team for every slot', () => {
        if (!bumpIn || !conferenceManifest.runsheets) return
        for (const { team } of Object.values(bumpIn.sponsors.slots)) {
            expect(Object.keys(conferenceManifest.runsheets.teamLabels)).toContain(team)
        }
    })
})
