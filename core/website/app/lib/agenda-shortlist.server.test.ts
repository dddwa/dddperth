import { beforeEach, describe, expect, it } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { d1FromSqlite, migratedSqlite } from './sponsors/sponsor-portal-harness'
import { createD1AgendaShortlistStore } from './services/cloudflare/d1-agenda-shortlist-store.server'
import type { AgendaShortlistStore } from './services/agenda-shortlist-store'
import type { Year } from './conference-state-client-safe'

/**
 * Shortlist counting, driven through the real store against real SQL built
 * from the real migration file — the same approach as the sponsor portal
 * harness, and for the same reason: the interesting failures here are
 * mismatches between the migration and the queries (a missing column, a
 * primary key that doesn't dedupe), which a mocked store reproduces happily.
 */

const YEAR_2026 = '2026' as Year
const YEAR_2025 = '2025' as Year

describe('agenda shortlist counting', () => {
    let sqlite: DatabaseSync
    let store: AgendaShortlistStore

    beforeEach(() => {
        // `migratedSqlite`'s default list is the sponsor portal's own curated
        // set; this suite needs only the shortlist table, so it names its
        // migration explicitly rather than growing a list another feature owns.
        sqlite = migratedSqlite(['0025_agenda_shortlist.sql'])
        store = createD1AgendaShortlistStore(d1FromSqlite(sqlite))
    })

    it('counts one pick per browser per talk', async () => {
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-b', year: YEAR_2026, talkId: 'talk-1' })

        const { countsByTalkId } = await store.getCountsForYear(YEAR_2026)

        expect(countsByTalkId['talk-1'].anonymous).toBe(2)
    })

    it('does not inflate when the same browser picks the same talk twice', async () => {
        // The whole point of keying on the browser: a double-tap, a retried
        // request, or a client that re-sends its full pick list on every
        // change must not each count as another person.
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })

        const { countsByTalkId } = await store.getCountsForYear(YEAR_2026)

        expect(countsByTalkId['talk-1'].anonymous).toBe(1)
    })

    it('removes a pick without touching other browsers', async () => {
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-b', year: YEAR_2026, talkId: 'talk-1' })

        await store.removePick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })

        const { countsByTalkId } = await store.getCountsForYear(YEAR_2026)
        expect(countsByTalkId['talk-1'].anonymous).toBe(1)
    })

    it('treats removing something never picked as a no-op', async () => {
        await store.removePick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })

        const { countsByTalkId } = await store.getCountsForYear(YEAR_2026)
        expect(countsByTalkId['talk-1']).toBeUndefined()
    })

    it('keeps years apart', async () => {
        // The point of keying by year: each conference's numbers stand alone,
        // and a talk id reused across years cannot pool its counts.
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2025, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-b', year: YEAR_2025, talkId: 'talk-1' })

        expect((await store.getCountsForYear(YEAR_2026)).countsByTalkId['talk-1'].anonymous).toBe(1)
        expect((await store.getCountsForYear(YEAR_2025)).countsByTalkId['talk-1'].anonymous).toBe(2)
    })

    it('reports anonymous and signed-in counts separately', async () => {
        // These must never be summed into one figure: anonymous is
        // one-per-cookie-jar and inflatable, signed-in will be one-per-person.
        // A blended total would have no stateable reliability.
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-b', year: YEAR_2026, talkId: 'talk-1', signedIn: true })
        await store.addPick({ browserId: 'browser-c', year: YEAR_2026, talkId: 'talk-1', signedIn: true })

        const counts = (await store.getCountsForYear(YEAR_2026)).countsByTalkId['talk-1']

        expect(counts.anonymous).toBe(1)
        expect(counts.signedIn).toBe(2)
    })

    it('upgrades a pick in place when a browser signs in', async () => {
        // Signing in must move the existing pick across rather than adding a
        // second one, otherwise one person appears in both columns.
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1', signedIn: true })

        const counts = (await store.getCountsForYear(YEAR_2026)).countsByTalkId['talk-1']

        expect(counts.anonymous).toBe(0)
        expect(counts.signedIn).toBe(1)
    })

    it('omits talks nobody picked rather than returning zeroes', async () => {
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })

        const { countsByTalkId } = await store.getCountsForYear(YEAR_2026)

        expect(Object.keys(countsByTalkId)).toEqual(['talk-1'])
    })

    it("lists a browser's own picks for a year", async () => {
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-1' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2026, talkId: 'talk-2' })
        await store.addPick({ browserId: 'browser-a', year: YEAR_2025, talkId: 'talk-3' })
        await store.addPick({ browserId: 'browser-b', year: YEAR_2026, talkId: 'talk-4' })

        const picks = await store.getPicksForBrowser({ browserId: 'browser-a', year: YEAR_2026 })

        expect(picks.sort()).toEqual(['talk-1', 'talk-2'])
    })
})
