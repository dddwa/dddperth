import { conferenceManifest } from '@conference/manifest'
import { afterEach, describe, expect, it } from 'vitest'
import { createSponsorPortalHarness, type SponsorPortalHarness } from './sponsor-portal-harness'

/**
 * End-to-end behaviour of the sponsor portal's two-way Jira sync, over a real
 * in-memory database and an in-memory Jira whose writes stick.
 *
 * Every scenario here corresponds to a bug that shipped, or nearly did, with
 * green unit tests either side of the seam it lived in. Module tests pin the
 * pieces; these pin the conversation between them.
 */

const portal = conferenceManifest.sponsorPortal

let harness: SponsorPortalHarness | undefined
afterEach(() => {
    harness?.close()
    harness = undefined
})

function setup(issues: Parameters<typeof createSponsorPortalHarness>[0]['issues']) {
    if (!portal) throw new Error('sponsorPortal is not configured')
    harness = createSponsorPortalHarness({ portalConfig: portal, issues })
    return harness
}

/** The fake's record for an issue the test just set up. */
function jiraIssue(h: SponsorPortalHarness, issueKey: string) {
    const issue = h.jira.issues.get(issueKey)
    if (!issue) throw new Error(`no such fake Jira issue: ${issueKey}`)
    return issue
}

/** A Gold sponsor: sees exhibition, screens, raffle and the social quote. */
const gold = {
    companyName: 'Globex',
    tier: 'Gold',
    contactEmails: ['sponsor@globex.test'],
}

describe.runIf(portal)('sponsor portal: committee data survives a sponsor save', () => {
    it('leaves untouched Jira answers alone when the sponsor saves one field', async () => {
        // The bug this exists for: pushLogistics looped over every *mapped*
        // field rather than every *submitted* one, so one save nulled
        // everything the committee had collected by email.
        const h = setup({
            'SPN-1': {
                ...gold,
                logistics: {
                    bumpInSlot: 'Friday 1pm - 2pm',
                    equipmentList: '2x crates',
                    rafflePrize: 'Keyboard',
                },
            },
        })
        await h.runSync()

        // The sponsor opens the form, changes only the raffle prize, saves.
        await h.saveLogisticsForm('SPN-1', { rafflePrize: 'Mechanical keyboard' }, ['rafflePrize'])

        expect(h.jira.issues.get('SPN-1')?.logistics).toEqual({
            bumpInSlot: 'Friday 1pm - 2pm',
            equipmentList: '2x crates',
            rafflePrize: 'Mechanical keyboard',
        })
    })

    it('clears a field the sponsor submitted empty', async () => {
        const h = setup({ 'SPN-1': { ...gold, logistics: { rafflePrize: 'Keyboard' } } })
        await h.runSync()

        // Submitted, but blank — a deliberate removal, unlike never answering.
        await h.saveLogisticsForm('SPN-1', { rafflePrize: '' }, ['rafflePrize'])

        expect(h.jira.issues.get('SPN-1')?.logistics?.rafflePrize).toBeUndefined()
    })

    it('never writes a field with no Jira mapping', async () => {
        // Screen ordering notes is the committee's own running note. It has no
        // mapping, so no portal save can reach it however it is submitted.
        const h = setup({ 'SPN-1': { ...gold, logistics: { screenNotes: 'informed PAV - 23/8' } } })
        await h.runSync()

        await h.saveLogisticsForm('SPN-1', { screenNotes: 'sponsor text', rafflePrize: 'Keyboard' }, [
            'screenNotes',
            'rafflePrize',
        ])

        expect(h.jira.issues.get('SPN-1')?.logistics?.screenNotes).toBe('informed PAV - 23/8')
    })

    it('ignores a crafted POST naming a section the tier cannot see', async () => {
        // Digital sponsors have no booth, so bump-in is not on their form.
        const h = setup({
            'SPN-1': {
                companyName: 'AFG',
                tier: 'Digital',
                contactEmails: ['sponsor@afg.test'],
                logistics: { bumpInSlot: 'Friday 1pm - 2pm' },
            },
        })
        await h.runSync()

        await h.saveLogisticsForm('SPN-1', { bumpInSlot: '' }, ['bumpInSlot'])

        expect(h.jira.issues.get('SPN-1')?.logistics?.bumpInSlot).toBe('Friday 1pm - 2pm')
    })
})

describe.runIf(portal)('sponsor portal: what the sponsor sees', () => {
    it('prefills the profile form from what the committee collected by email', async () => {
        const h = setup({
            'SPN-1': {
                ...gold,
                quote: 'Globex backs the local tech community.',
                website: 'https://globex.test',
                socials: { linkedin: 'https://linkedin.com/company/globex' },
            },
        })
        await h.runSync()

        expect(await h.profileForm('SPN-1')).toEqual({
            blurb: 'Globex backs the local tech community.',
            websiteUrl: 'https://globex.test',
            socials: { linkedin: 'https://linkedin.com/company/globex' },
        })
    })

    it('prefills the logistics form, so nobody retypes what they already sent', async () => {
        const h = setup({
            'SPN-1': { ...gold, logistics: { bumpInSlot: 'Friday 1pm - 2pm', screenOrders: '55" LCD ($500+GST)' } },
        })
        await h.runSync()

        expect(await h.logisticsForm('SPN-1')).toMatchObject({
            bumpInSlot: 'Friday 1pm - 2pm',
            screenOrders: '55" LCD ($500+GST)',
        })
    })

    it('keeps a logo-only profile on the prefill path', async () => {
        // A logo upload must not count as "submitted the details form", or the
        // sponsor stops seeing the committee's blurb.
        const h = setup({ 'SPN-1': { ...gold, quote: 'From Jira' } })
        await h.runSync()
        await h.store.saveLogo(
            'SPN-1',
            { r2Key: 'logo', filename: 'logo.svg', contentType: 'image/svg+xml', size: 10 },
            'sponsor@globex.test',
        )

        await h.runSync()

        expect((await h.profileForm('SPN-1')).blurb).toBe('From Jira')
    })
})

describe.runIf(portal)('sponsor portal: Jira stays canonical after a submission', () => {
    it('replaces a submitted profile with a later committee edit', async () => {
        const h = setup({ 'SPN-1': { ...gold, quote: 'Original', website: 'https://globex.test' } })
        await h.runSync()
        await h.saveProfileForm('SPN-1', {
            blurb: 'Sponsor wrote this',
            websiteUrl: 'https://globex.test',
            socials: {},
        })

        // Aaron edits the blurb in Jira after the sponsor submitted.
        jiraIssue(h, 'SPN-1').quote = 'Committee rewrote this'
        await h.runSync()

        expect((await h.profileForm('SPN-1')).blurb).toBe('Committee rewrote this')
    })

    it('propagates a Jira-side clear rather than leaving the old portal value', async () => {
        // A cleared Jira field is simply absent from the response, so this only
        // works because the sync enumerates the configured keys.
        const h = setup({ 'SPN-1': { ...gold, quote: 'Original', website: 'https://globex.test' } })
        await h.runSync()
        await h.saveProfileForm('SPN-1', { blurb: 'Sponsor wrote this', websiteUrl: 'https://globex.test', socials: {} })

        delete jiraIssue(h, 'SPN-1').quote
        await h.runSync()

        expect((await h.profileForm('SPN-1')).blurb).toBe('')
    })

    it('keeps portal-only answers that Jira has no field for', async () => {
        // additionalNotes is spreadsheet-only. A Jira-driven reconcile must not
        // drop it just because Jira has nothing to say about it.
        const h = setup({ 'SPN-1': { ...gold } })
        await h.runSync()
        await h.saveLogisticsForm('SPN-1', { rafflePrize: 'Keyboard', additionalNotes: 'Parking is tight' }, [
            'rafflePrize',
            'additionalNotes',
        ])

        await h.runSync()

        expect((await h.logisticsForm('SPN-1')).additionalNotes).toBe('Parking is tight')
    })
})

describe.runIf(portal)('sponsor portal: a rejected save tells the sponsor', () => {
    it('fails the save when Jira will not accept the answer', async () => {
        // bumpInSlot is a single-select in Jira. Free text that matches no
        // option used to be dropped silently behind a success banner.
        const h = setup({ 'SPN-1': { ...gold } })
        await h.runSync()

        await expect(
            h.saveLogisticsForm('SPN-1', { bumpInSlot: 'Friday afternoon sometime' }, ['bumpInSlot']),
        ).rejects.toThrow(/cannot accept/i)
    })

    it('leaves the portal copy untouched when Jira rejects', async () => {
        // Jira-first ordering: nothing reaches D1 if the push failed, so the
        // sponsor can correct and resubmit against unchanged state.
        const h = setup({ 'SPN-1': { ...gold, logistics: { bumpInSlot: 'Friday 1pm - 2pm' } } })
        await h.runSync()

        await expect(
            h.saveLogisticsForm('SPN-1', { bumpInSlot: 'Whenever suits' }, ['bumpInSlot']),
        ).rejects.toThrow()

        expect((await h.logisticsForm('SPN-1')).bumpInSlot).toBe('Friday 1pm - 2pm')
        expect(h.jira.issues.get('SPN-1')?.logistics?.bumpInSlot).toBe('Friday 1pm - 2pm')
    })
})

describe.runIf(portal)('sponsor portal: committee-owned display fields', () => {
    it('surfaces the assigned room and upload folder, and hides them when unset', async () => {
        const h = setup({
            'SPN-1': { ...gold, exhibitorRoom: 'River View Room 2', assetUploadUrl: 'https://sharepoint.test/f' },
            'SPN-2': { companyName: 'Acme', tier: 'Platinum', contactEmails: ['a@acme.test'] },
        })
        await h.runSync()

        expect(await h.sync.getSponsorDeliverables('SPN-1')).toMatchObject({
            exhibitorRoom: 'River View Room 2',
            assetUploadUrl: 'https://sharepoint.test/f',
        })
        const unset = await h.sync.getSponsorDeliverables('SPN-2')
        expect(unset.exhibitorRoom).toBeUndefined()
        expect(unset.assetUploadUrl).toBeUndefined()
    })

    it('stores the room on the sponsor record for the admin list', async () => {
        const h = setup({ 'SPN-1': { ...gold, exhibitorRoom: 'Sports Lounge' } })
        await h.runSync()

        expect((await h.store.getSponsor('SPN-1'))?.exhibitorRoom).toBe('Sports Lounge')
    })
})
