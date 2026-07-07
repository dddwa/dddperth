import { describe, expect, it } from 'vitest'
import { computeSyncPlan, parseContactEmails, type SyncSourceSponsor } from './sync-plan'

describe('parseContactEmails', () => {
    it('splits on commas and semicolons', () => {
        expect(parseContactEmails('a@example.com, b@example.com; c@example.com')).toEqual([
            'a@example.com',
            'b@example.com',
            'c@example.com',
        ])
    })

    it('normalises case and whitespace', () => {
        expect(parseContactEmails('  Sales@Example.COM ')).toEqual(['sales@example.com'])
    })

    it('drops invalid entries instead of failing', () => {
        expect(parseContactEmails('a@example.com, not-an-email, @nope, b@example.com')).toEqual([
            'a@example.com',
            'b@example.com',
        ])
    })

    it('deduplicates', () => {
        expect(parseContactEmails('a@example.com, A@example.com')).toEqual(['a@example.com'])
    })

    it('handles empty/null input', () => {
        expect(parseContactEmails('')).toEqual([])
        expect(parseContactEmails(null)).toEqual([])
        expect(parseContactEmails(undefined)).toEqual([])
    })
})

function sponsor(overrides: Partial<SyncSourceSponsor> & { issueKey: string }): SyncSourceSponsor {
    return {
        companyName: 'Acme',
        tier: 'Gold',
        contactEmails: [],
        ...overrides,
    }
}

describe('computeSyncPlan', () => {
    it('upserts new sponsors and adds their contacts', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [sponsor({ issueKey: 'SPN-1', contactEmails: ['a@example.com'] })],
            currentSponsors: [],
            currentContacts: [],
        })

        expect(plan.upserts).toEqual([
            { issueKey: 'SPN-1', year: '2026', companyName: 'Acme', tier: 'Gold', website: undefined, jiraStatus: undefined },
        ])
        expect(plan.contactAdds).toEqual([{ email: 'a@example.com', issueKey: 'SPN-1' }])
        expect(plan.deactivateIssueKeys).toEqual([])
        expect(plan.contactRemoves).toEqual([])
    })

    it('deactivates active sponsors missing from the source', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [],
            currentSponsors: [
                { issueKey: 'SPN-1', active: true },
                { issueKey: 'SPN-2', active: false },
            ],
            currentContacts: [],
        })

        expect(plan.deactivateIssueKeys).toEqual(['SPN-1'])
    })

    it('does not re-deactivate already-inactive sponsors', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [],
            currentSponsors: [{ issueKey: 'SPN-9', active: false }],
            currentContacts: [],
        })
        expect(plan.deactivateIssueKeys).toEqual([])
    })

    it('reactivates a returning sponsor via upsert', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [sponsor({ issueKey: 'SPN-1' })],
            currentSponsors: [{ issueKey: 'SPN-1', active: false }],
            currentContacts: [],
        })
        expect(plan.upserts.map((u) => u.issueKey)).toEqual(['SPN-1'])
        expect(plan.deactivateIssueKeys).toEqual([])
    })

    it('removes contacts dropped from the Jira field', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [sponsor({ issueKey: 'SPN-1', contactEmails: ['keep@example.com'] })],
            currentSponsors: [{ issueKey: 'SPN-1', active: true }],
            currentContacts: [
                { email: 'keep@example.com', issueKey: 'SPN-1' },
                { email: 'gone@example.com', issueKey: 'SPN-1' },
            ],
        })

        expect(plan.contactAdds).toEqual([])
        expect(plan.contactRemoves).toEqual([{ email: 'gone@example.com', issueKey: 'SPN-1' }])
    })

    it('removes contacts of departed sponsors so a returning sponsor starts fresh', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [],
            currentSponsors: [{ issueKey: 'SPN-1', active: true }],
            currentContacts: [{ email: 'old@example.com', issueKey: 'SPN-1' }],
        })

        expect(plan.deactivateIssueKeys).toEqual(['SPN-1'])
        expect(plan.contactRemoves).toEqual([{ email: 'old@example.com', issueKey: 'SPN-1' }])
    })

    it('handles tier changes through upsert', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [sponsor({ issueKey: 'SPN-1', tier: 'Platinum' })],
            currentSponsors: [{ issueKey: 'SPN-1', active: true }],
            currentContacts: [],
        })
        expect(plan.upserts[0].tier).toBe('Platinum')
    })

    it('supports one email across multiple sponsors', () => {
        const plan = computeSyncPlan({
            year: '2026',
            source: [
                sponsor({ issueKey: 'SPN-1', contactEmails: ['shared@example.com'] }),
                sponsor({ issueKey: 'SPN-2', contactEmails: ['shared@example.com'] }),
            ],
            currentSponsors: [],
            currentContacts: [],
        })
        expect(plan.contactAdds).toEqual([
            { email: 'shared@example.com', issueKey: 'SPN-1' },
            { email: 'shared@example.com', issueKey: 'SPN-2' },
        ])
    })
})
