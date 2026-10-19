import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import { computeSyncPlan, type SyncSourceSponsor } from '../../sponsors/sync-plan'
import type { SponsorsStore } from '../sponsors-store'
import { createD1SponsorsStore } from './d1-sponsors-store.server'

describe('sponsor two-way sync (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: SponsorsStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        for (const name of [
            '0004_sponsor_portal.sql',
            '0019_sponsor_logistics.sql',
            '0020_sponsor_logistics_submitted.sql',
            '0021_sponsor_jira_prefill.sql',
            '0022_sponsor_jira_logistics_prefill.sql',
            '0023_sponsor_two_way_sync.sql',
            '0024_sponsor_exhibitor_room.sql',
        ])
            migrate(sqlite, name)
        store = createD1SponsorsStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    async function sync(overrides: Partial<SyncSourceSponsor> = {}) {
        const source: SyncSourceSponsor = {
            issueKey: 'SPN-1',
            companyName: 'Acme',
            tier: 'Gold',
            contactEmails: ['sponsor@example.com'],
            ...overrides,
        }
        const plan = computeSyncPlan({
            year: '2026',
            source: [source],
            currentSponsors: await store.getAllSponsorsForSync(),
            currentContacts: await store.getAllContacts(),
        })
        await store.applySyncPlan(plan)
    }

    it('does not replace a save made during the Jira read, even within the same second', async () => {
        await sync()
        await store.saveDetails('SPN-1', { blurb: 'Original', websiteUrl: 'https://old.test', socials: {} }, 'sponsor')
        await store.saveLogistics('SPN-1', { rafflePrize: 'Original prize' }, 'sponsor')
        sqlite.exec('UPDATE sponsor_profiles SET details_updated_at = 100, logistics_updated_at = 100')
        const beforeRead = await store.getProfilesForSync()
        // Jira returns the old values, while the sponsor successfully saves new ones.
        await store.saveDetails('SPN-1', { blurb: 'New', websiteUrl: 'https://new.test', socials: {} }, 'sponsor')
        await store.saveLogistics('SPN-1', { rafflePrize: 'New prize' }, 'sponsor')
        sqlite.exec('UPDATE sponsor_profiles SET details_updated_at = 100, logistics_updated_at = 100')
        const plan = computeSyncPlan({
            year: '2026',
            source: [
                {
                    issueKey: 'SPN-1',
                    companyName: 'Acme',
                    tier: 'Gold',
                    contactEmails: [],
                    quote: 'Old',
                    website: 'https://old.test',
                    logistics: { rafflePrize: 'Old prize' },
                    logisticsKeys: ['rafflePrize'],
                },
            ],
            currentSponsors: await store.getAllSponsorsForSync(),
            currentContacts: await store.getAllContacts(),
        })
        await store.applySyncPlan(plan, beforeRead)
        expect(await store.getProfile('SPN-1')).toMatchObject({ blurb: 'New', logistics: { rafflePrize: 'New prize' } })
        // A later read can still import deliberate committee changes immediately.
        await store.applySyncPlan(plan, await store.getProfilesForSync())
        expect(await store.getProfile('SPN-1')).toMatchObject({ blurb: 'Old', logistics: { rafflePrize: 'Old prize' } })
    })

    it('stores Jira prefills without inventing a portal submission', async () => {
        await sync({ quote: 'From Jira', website: 'https://jira.test', socials: { linkedin: 'https://in.test' } })
        expect(await store.getProfile('SPN-1')).toBeNull()
        expect(await store.getSponsorForEmail('sponsor@example.com')).toMatchObject({
            jiraQuote: 'From Jira',
            website: 'https://jira.test',
            jiraSocials: { linkedin: 'https://in.test' },
        })
    })

    it('replaces submitted portal details with subsequent Jira edits', async () => {
        await sync()
        await store.saveDetails(
            'SPN-1',
            { blurb: 'Portal', websiteUrl: 'https://portal.test', socials: { twitter: 'https://x.test' } },
            'sponsor@example.com',
        )
        expect((await store.getProfile('SPN-1'))?.detailsUpdatedAt).toBeTypeOf('number')
        await sync({ quote: 'Committee edit', website: 'https://jira.test', socials: { linkedin: 'https://in.test' } })
        expect(await store.getProfile('SPN-1')).toMatchObject({
            blurb: 'Committee edit',
            websiteUrl: 'https://jira.test',
            socials: { linkedin: 'https://in.test' },
            updatedBy: 'jira-sync',
        })
    })

    it('propagates Jira clears instead of retaining old portal details', async () => {
        await sync()
        await store.saveDetails(
            'SPN-1',
            { blurb: 'Portal', websiteUrl: 'https://portal.test', socials: { twitter: 'https://x.test' } },
            'sponsor@example.com',
        )
        await sync()
        expect(await store.getProfile('SPN-1')).toMatchObject({
            blurb: undefined,
            websiteUrl: undefined,
            socials: {},
        })
    })

    it('updates and clears mapped logistics while retaining portal-only notes and the logo', async () => {
        await sync()
        await store.saveLogistics(
            'SPN-1',
            { rafflePrize: 'Keyboard', bumpInSlot: 'Friday 1pm', additionalNotes: 'Venue note' },
            'sponsor@example.com',
        )
        await store.saveLogo(
            'SPN-1',
            { r2Key: 'logo', filename: 'logo.svg', contentType: 'image/svg+xml', size: 10 },
            'sponsor@example.com',
        )
        await sync({ logistics: { bumpInSlot: 'Friday 4pm' }, logisticsKeys: ['bumpInSlot', 'rafflePrize'] })
        expect(await store.getProfile('SPN-1')).toMatchObject({
            logistics: { bumpInSlot: 'Friday 4pm', additionalNotes: 'Venue note' },
            logo: { r2Key: 'logo' },
        })
    })

    it('keeps a logo-only profile on the prefill path', async () => {
        await sync()
        await store.saveLogo(
            'SPN-1',
            { r2Key: 'logo', filename: 'logo.svg', contentType: 'image/svg+xml', size: 10 },
            'sponsor@example.com',
        )
        await sync({ quote: 'From Jira', website: 'https://jira.test' })
        expect(await store.getProfile('SPN-1')).toMatchObject({ detailsUpdatedAt: undefined, blurb: undefined })
        expect((await store.getSponsor('SPN-1'))?.jiraQuote).toBe('From Jira')
    })
})

describe('two-way sync migration', () => {
    it('backfills existing details submissions but leaves logo-only profiles untouched', () => {
        const sqlite = new DatabaseSync(':memory:')
        try {
            migrate(sqlite, '0004_sponsor_portal.sql')
            sqlite.exec(
                `INSERT INTO sponsor_profiles (issue_key, blurb, socials_json, updated_at, updated_by)
                 VALUES ('details', 'Submitted', '{}', 123, 'sponsor'), ('logo-only', NULL, NULL, 456, 'sponsor')`,
            )
            migrate(sqlite, '0023_sponsor_two_way_sync.sql')
            expect(
                sqlite.prepare('SELECT issue_key, details_updated_at FROM sponsor_profiles ORDER BY issue_key').all(),
            ).toEqual([
                { issue_key: 'details', details_updated_at: 123 },
                { issue_key: 'logo-only', details_updated_at: null },
            ])
        } finally {
            sqlite.close()
        }
    })
})
