import type { CompetitionEntry, CompetitionStore } from '../competition-store'

interface CompetitionEntryRow {
    id: string
    name: string
    email: string
    answer: string
    created_at: number
}

function toEntry(row: CompetitionEntryRow): CompetitionEntry {
    return { id: row.id, name: row.name, email: row.email, answer: row.answer, submittedAt: row.created_at }
}

export function createD1CompetitionStore(db: D1Database): CompetitionStore {
    return {
        async saveEntry(competitionSlug, input) {
            // eslint-disable-next-line dates/use-date-time-provider -- Operational expiry, locks, and persisted audit records must follow real time.
            const now = Math.floor(Date.now() / 1000)
            const result = await db
                .prepare(
                    `INSERT INTO competition_entries
                        (id, competition_slug, name, email, email_key, answer, terms_accepted_at, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT (competition_slug, email_key) DO NOTHING`,
                )
                .bind(crypto.randomUUID(), competitionSlug, input.name, input.email, input.emailKey, input.answer, now, now)
                .run()
            return (result.meta.changes ?? 0) > 0
        },

        async listEntries(competitionSlug) {
            const { results } = await db
                .prepare(
                    `SELECT id, name, email, answer, created_at FROM competition_entries
                     WHERE competition_slug = ? ORDER BY created_at, id`,
                )
                .bind(competitionSlug)
                .all<CompetitionEntryRow>()
            return results.map(toEntry)
        },

        async countEntries() {
            const { results } = await db
                .prepare(`SELECT competition_slug, COUNT(*) AS n FROM competition_entries GROUP BY competition_slug`)
                .all<{ competition_slug: string; n: number }>()
            return Object.fromEntries(results.map((row) => [row.competition_slug, row.n]))
        },
    }
}
