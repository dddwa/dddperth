import type { SurveyResponse, SurveyResponseInput, SurveyStore } from '../survey-store'

interface SurveyResponseRow {
    id: string
    answers: string
    email: string | null
    created_at: number
}

function toResponse(row: SurveyResponseRow): SurveyResponse {
    const stored = JSON.parse(row.answers) as Partial<Pick<SurveyResponseInput, 'answers' | 'others'>>
    return {
        id: row.id,
        answers: stored.answers ?? {},
        others: stored.others ?? {},
        email: row.email,
        submittedAt: row.created_at,
    }
}

export function createD1SurveyStore(db: D1Database): SurveyStore {
    return {
        async saveResponse(surveySlug, input) {
            // eslint-disable-next-line dates/use-date-time-provider -- Operational expiry, locks, and persisted audit records must follow real time.
            const now = Math.floor(Date.now() / 1000)
            await db
                .prepare(
                    `INSERT INTO survey_responses (id, survey_slug, answers, email, created_at) VALUES (?, ?, ?, ?, ?)`,
                )
                .bind(
                    crypto.randomUUID(),
                    surveySlug,
                    JSON.stringify({ answers: input.answers, others: input.others }),
                    input.email,
                    now,
                )
                .run()
        },

        async listResponses(surveySlug) {
            const { results } = await db
                .prepare(
                    `SELECT id, answers, email, created_at FROM survey_responses
                     WHERE survey_slug = ? ORDER BY created_at, id`,
                )
                .bind(surveySlug)
                .all<SurveyResponseRow>()
            return results.map(toResponse)
        },

        async countResponses() {
            const { results } = await db
                .prepare(`SELECT survey_slug, COUNT(*) AS n FROM survey_responses GROUP BY survey_slug`)
                .all<{ survey_slug: string; n: number }>()
            return Object.fromEntries(results.map((row) => [row.survey_slug, row.n]))
        },
    }
}
