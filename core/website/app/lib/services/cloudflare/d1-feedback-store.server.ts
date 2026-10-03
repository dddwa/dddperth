import type { ConferenceFeedback, FeedbackStore, TalkFeedback } from '../feedback-store'

interface ConferenceFeedbackRow {
    id: string
    rating: number
    best_thing: string | null
    ideas: string | null
    feedback: string | null
    email: string | null
    updated_at: number
}

interface TalkFeedbackRow {
    id: string
    target_id: string
    rating: number
    speaker_feedback: string | null
    organiser_feedback: string | null
    email: string | null
    updated_at: number
}

function toConferenceFeedback(row: ConferenceFeedbackRow): ConferenceFeedback {
    return {
        id: row.id,
        rating: row.rating,
        bestThing: row.best_thing,
        ideas: row.ideas,
        feedback: row.feedback,
        email: row.email,
        submittedAt: row.updated_at,
    }
}

function toTalkFeedback(row: TalkFeedbackRow): TalkFeedback {
    return {
        id: row.id,
        targetId: row.target_id,
        rating: row.rating,
        speakerFeedback: row.speaker_feedback,
        organiserFeedback: row.organiser_feedback,
        email: row.email,
        submittedAt: row.updated_at,
    }
}

export function createD1FeedbackStore(db: D1Database): FeedbackStore {
    return {
        async saveConferenceFeedback(year, submitterId, input) {
            const now = Math.floor(Date.now() / 1000)
            await db
                .prepare(
                    `INSERT INTO conference_feedback
                        (id, year, submitter_id, rating, best_thing, ideas, feedback, email, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(
                    crypto.randomUUID(),
                    year,
                    submitterId,
                    input.rating,
                    input.bestThing,
                    input.ideas,
                    input.feedback,
                    input.email,
                    now,
                    now,
                )
                .run()
        },

        async saveTalkFeedback(year, submitterId, input) {
            const now = Math.floor(Date.now() / 1000)
            const result = await db
                .prepare(
                    `INSERT INTO talk_feedback
                        (id, year, target_id, submitter_id, rating, speaker_feedback, organiser_feedback, email, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT (year, target_id, submitter_id) DO NOTHING`,
                )
                .bind(
                    crypto.randomUUID(),
                    year,
                    input.targetId,
                    submitterId,
                    input.rating,
                    input.speakerFeedback,
                    input.organiserFeedback,
                    input.email,
                    now,
                    now,
                )
                .run()
            return (result.meta.changes ?? 0) > 0
        },

        async listTalkFeedbackTargetIds(year, submitterId) {
            const { results } = await db
                .prepare(`SELECT target_id FROM talk_feedback WHERE year = ? AND submitter_id = ?`)
                .bind(year, submitterId)
                .all<{ target_id: string }>()
            return results.map((row) => row.target_id)
        },

        async listConferenceFeedback(year) {
            const { results } = await db
                .prepare(
                    `SELECT id, rating, best_thing, ideas, feedback, email, updated_at
                     FROM conference_feedback WHERE year = ? ORDER BY updated_at DESC, id`,
                )
                .bind(year)
                .all<ConferenceFeedbackRow>()
            return results.map(toConferenceFeedback)
        },

        async listTalkFeedback(year) {
            const { results } = await db
                .prepare(
                    `SELECT id, target_id, rating, speaker_feedback, organiser_feedback, email, updated_at
                     FROM talk_feedback WHERE year = ? ORDER BY updated_at DESC, id`,
                )
                .bind(year)
                .all<TalkFeedbackRow>()
            return results.map(toTalkFeedback)
        },
    }
}
