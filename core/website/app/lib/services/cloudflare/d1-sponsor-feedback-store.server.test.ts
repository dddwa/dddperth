import { DatabaseSync } from 'node:sqlite'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { d1FromSqlite, migrate } from '../../sponsors/sponsor-portal-harness'
import type { SponsorFeedbackInput, SponsorFeedbackStore } from '../sponsor-feedback-store'
import { createD1SponsorFeedbackStore } from './d1-sponsor-feedback-store.server'

const input: SponsorFeedbackInput = {
    rating: 4,
    experience: 'Great crowd at the booth',
    ideas: null,
    testimonial: 'Best hiring event of our year',
    testimonialAttribution: 'Sam, CTO',
    testimonialConsent: true,
    portalFeedback: null,
}

describe('D1 sponsor feedback store (real SQL)', () => {
    let sqlite: DatabaseSync
    let store: SponsorFeedbackStore

    beforeEach(() => {
        sqlite = new DatabaseSync(':memory:')
        migrate(sqlite, '0031_sponsor_feedback.sql')
        store = createD1SponsorFeedbackStore(d1FromSqlite(sqlite))
    })

    afterEach(() => sqlite.close())

    it('keeps every submission from a sponsor, scoped to the year', async () => {
        await store.create('2026', 'SPN-1', input, 'a@acme.test')
        await store.create('2026', 'SPN-1', { ...input, ideas: 'A quiet room' }, 'b@acme.test')
        await store.create('2026', 'SPN-2', input, 'c@other.test')
        await store.create('2027', 'SPN-1', input, 'a@acme.test')

        const rows = await store.listForSponsor('2026', 'SPN-1')
        expect(rows.map((r) => r.submittedBy)).toEqual(['a@acme.test', 'b@acme.test'])
        expect(rows[0]).toMatchObject({ ...input, issueKey: 'SPN-1' })
        expect(await store.listForYear('2026')).toHaveLength(3)
    })

    it('lets the sponsor edit their own submission, recording who edited it', async () => {
        const id = await store.create('2026', 'SPN-1', input, 'a@acme.test')

        const updated = await store.update('SPN-1', id, { ...input, testimonialConsent: false, rating: null }, 'b@acme.test')

        expect(updated).toBe(true)
        expect(await store.listForSponsor('2026', 'SPN-1')).toEqual([
            expect.objectContaining({
                testimonialConsent: false,
                rating: null,
                submittedBy: 'a@acme.test',
                updatedBy: 'b@acme.test',
            }),
        ])
    })

    it("refuses to edit another sponsor's submission", async () => {
        const id = await store.create('2026', 'SPN-1', input, 'a@acme.test')

        expect(await store.update('SPN-2', id, { ...input, experience: 'hijacked' }, 'c@other.test')).toBe(false)
        expect((await store.listForSponsor('2026', 'SPN-1'))[0].experience).toBe(input.experience)
    })

    it('rejects a rating outside 1–5 at the database too', async () => {
        await expect(store.create('2026', 'SPN-1', { ...input, rating: 6 }, 'a@acme.test')).rejects.toThrow()
    })

    it('records each request with every address it went to', async () => {
        await store.recordRequest('2026', 'SPN-1', ['a@acme.test', 'b@acme.test'], 'admin@ddd.test')
        await store.recordRequest('2027', 'SPN-1', ['a@acme.test'], 'admin@ddd.test')

        expect(await store.listRequests('2026')).toEqual([
            expect.objectContaining({ issueKey: 'SPN-1', recipients: ['a@acme.test', 'b@acme.test'], sentBy: 'admin@ddd.test' }),
        ])
    })
})
