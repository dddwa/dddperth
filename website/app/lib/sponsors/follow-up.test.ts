import { describe, expect, it } from 'vitest'
import type { SponsorListEntry, SponsorProfile } from '../services/sponsors-store'
import { buildFollowUpRow, followUpEmail, mailtoUrl, sectionChaseEmail, sortForFollowUp } from './follow-up'
import { logisticsVisibility } from './logistics'

const logo: SponsorProfile['logo'] = {
    r2Key: 'k',
    filename: 'logo.svg',
    contentType: 'image/svg+xml',
    size: 10,
    uploadedAt: 1_700_000_000,
}

function sponsor(overrides: Partial<SponsorListEntry> = {}): SponsorListEntry {
    return {
        issueKey: 'SPN-1',
        year: '2026',
        companyName: 'Acme',
        tier: 'Gold',
        active: true,
        assetsTaskPending: false,
        contacts: ['a@acme.example'],
        profile: null,
        ...overrides,
    }
}

function row(overrides: Partial<SponsorListEntry> = {}, tier = 'gold') {
    return buildFollowUpRow({
        sponsor: sponsor(overrides),
        visibility: logisticsVisibility(tier),
        meetTheExpertsResponded: false,
        meetTheExpertsOffered: true,
        assets: undefined,
    })
}

const context = { conferenceName: 'DDD Perth 2026', portalUrl: 'https://example.com/portal', senderName: 'Jake' }

/** Decodes the body param so assertions read like the email. */
function body(url: string | null | undefined): string {
    return decodeURIComponent(new URL(url ?? 'mailto:').searchParams.get('body') ?? '')
}

describe('buildFollowUpRow', () => {
    it('lists every missing required item by name for a sponsor who has done nothing', () => {
        expect(row().requiredOutstanding).toEqual([
            'Company logo',
            'Company blurb',
            'Website URL',
            'On-the-day contact name',
            'On-the-day contact phone',
            'On-the-day contact email',
            'Bump-in day and time',
            'Bump-out window',
            'Equipment list',
        ])
        expect(row().lastPortalSave).toBeUndefined()
    })

    it('counts committee-entered Jira answers as supplied, like the sponsor dashboard does', () => {
        const result = row({ website: 'https://acme.example', jiraLogistics: { bumpInSlot: 'Friday 1pm - 2pm' } })
        expect(result.requiredOutstanding).not.toContain('Website URL')
        expect(result.requiredOutstanding).not.toContain('Bump-in day and time')
        expect(result.answers.bumpInSlot).toBe('Friday 1pm - 2pm')
    })

    it('skips exhibition and screens for tiers without a booth', () => {
        const result = row({}, 'digital')
        expect(result.hasBooth).toBe(false)
        expect(result.requiredOutstanding).toEqual(['Company logo', 'Company blurb', 'Website URL'])
        expect(result.optionalOutstanding).not.toContain('TV screen order')
    })

    it('takes last portal save from sponsor saves, not the sync-bumped updatedAt', () => {
        const result = row({
            profile: {
                issueKey: 'SPN-1',
                socials: {},
                logo,
                detailsUpdatedAt: 1_700_000_500,
                updatedAt: 1_800_000_000,
            },
        })
        expect(result.lastPortalSave).toBe(1_700_000_500)
    })

    it('flags video from the assets owed, and marks assets unknown when Jira could not be read', () => {
        const withAssets = buildFollowUpRow({
            sponsor: sponsor(),
            visibility: logisticsVisibility('gold'),
            meetTheExpertsResponded: false,
            meetTheExpertsOffered: false,
            assets: {
                assetsRequired: 'Logo and blurb on Website (All types), Video for Mega Screen (Platinum, Gold)',
                assetsStatus: 'All Assets received',
                uploadUrl: 'https://example.sharepoint.com/acme',
            },
        })
        expect(withAssets.assets).toEqual({
            known: true,
            required: ['Logo and blurb on Website', 'Video for Mega Screen'],
            videoRequired: true,
            status: 'All Assets received',
            uploadUrl: 'https://example.sharepoint.com/acme',
        })

        const unknown = buildFollowUpRow({
            sponsor: sponsor(),
            visibility: logisticsVisibility('gold'),
            meetTheExpertsResponded: false,
            meetTheExpertsOffered: false,
            assets: null,
        })
        expect(unknown.assets).toEqual({ known: false })
    })
})

describe('sortForFollowUp', () => {
    it('puts the most outstanding first, then never-opened before active', () => {
        const done = row(
            {
                companyName: 'Done',
                website: 'https://x.example',
                jiraQuote: 'q',
                profile: { issueKey: 'SPN-1', socials: {}, logo },
            },
            'digital',
        )
        const untouched = row({ companyName: 'Untouched' })
        expect(sortForFollowUp([done, untouched]).map((r) => r.companyName)).toEqual(['Untouched', 'Done'])
    })
})

describe('followUpEmail', () => {
    it('addresses every contact and lists required then optional items', () => {
        const url = followUpEmail(row({ contacts: ['a@acme.example', 'b@acme.example'] }), context)
        expect(url).toMatch(/^mailto:a@acme\.example,b@acme\.example\?/)
        const text = body(url)
        expect(text).toContain('We still need:\r\n- Company logo')
        expect(text).toContain('And if they apply to you:')
        expect(text).toContain("TV screens — let us know if you'd like one")
        expect(text).toContain('https://example.com/portal')
        expect(text.endsWith('Thanks,\r\nJake')).toBe(true)
    })

    it('is null when there are no contacts to email', () => {
        expect(followUpEmail(row({ contacts: [] }), context)).toBeNull()
    })
})

describe('sectionChaseEmail', () => {
    it('BCCs each contact of every sponsor missing the section, once', () => {
        const rows = [
            row({ issueKey: 'SPN-1', contacts: ['a@x.example', 'shared@x.example'] }),
            row({ issueKey: 'SPN-2', contacts: ['shared@x.example'] }),
        ]
        const chase = sectionChaseEmail(rows, 'exhibition', context)
        expect(chase?.sponsorCount).toBe(2)
        expect(chase?.label).toBe('Exhibition & bump-in')
        expect(new URL(chase?.url ?? 'mailto:').searchParams.get('bcc')).toBe('a@x.example,shared@x.example')
    })

    it('is null when nobody is missing the section', () => {
        expect(sectionChaseEmail([row({}, 'digital')], 'exhibition', context)).toBeNull()
    })
})

describe('mailtoUrl', () => {
    it('encodes subject and body but leaves addresses readable', () => {
        expect(mailtoUrl({ to: ['a+b@x.example'], subject: 'A & B', body: 'one\ntwo' })).toBe(
            'mailto:a%2Bb@x.example?subject=A%20%26%20B&body=one%0D%0Atwo',
        )
    })
})
