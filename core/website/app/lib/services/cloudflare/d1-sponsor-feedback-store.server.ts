import type { SponsorFeedback, SponsorFeedbackStore } from '../sponsor-feedback-store'

interface SponsorFeedbackRow {
    id: string
    issue_key: string
    rating: number | null
    experience: string | null
    ideas: string | null
    testimonial: string | null
    testimonial_attribution: string | null
    portal_feedback: string | null
    submitted_by: string
    updated_by: string
    created_at: number
    updated_at: number
}

const COLUMNS = `id, issue_key, rating, experience, ideas, testimonial, testimonial_attribution,
    portal_feedback, submitted_by, updated_by, created_at, updated_at`

function toSponsorFeedback(row: SponsorFeedbackRow): SponsorFeedback {
    return {
        id: row.id,
        issueKey: row.issue_key,
        rating: row.rating,
        experience: row.experience,
        ideas: row.ideas,
        testimonial: row.testimonial,
        testimonialAttribution: row.testimonial_attribution,
        portalFeedback: row.portal_feedback,
        submittedBy: row.submitted_by,
        updatedBy: row.updated_by,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    }
}

export function createD1SponsorFeedbackStore(db: D1Database): SponsorFeedbackStore {
    return {
        async create(year, issueKey, input, by) {
            const id = crypto.randomUUID()
            const now = Math.floor(Date.now() / 1000)
            await db
                .prepare(
                    `INSERT INTO sponsor_feedback
                        (id, year, issue_key, rating, experience, ideas, testimonial, testimonial_attribution,
                         portal_feedback, submitted_by, updated_by, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                )
                .bind(
                    id,
                    year,
                    issueKey,
                    input.rating,
                    input.experience,
                    input.ideas,
                    input.testimonial,
                    input.testimonialAttribution,
                    input.portalFeedback,
                    by,
                    by,
                    now,
                    now,
                )
                .run()
            return id
        },

        async update(issueKey, id, input, by) {
            const result = await db
                .prepare(
                    `UPDATE sponsor_feedback
                     SET rating = ?, experience = ?, ideas = ?, testimonial = ?, testimonial_attribution = ?,
                         portal_feedback = ?, updated_by = ?, updated_at = ?
                     WHERE id = ? AND issue_key = ?`,
                )
                .bind(
                    input.rating,
                    input.experience,
                    input.ideas,
                    input.testimonial,
                    input.testimonialAttribution,
                    input.portalFeedback,
                    by,
                    Math.floor(Date.now() / 1000),
                    id,
                    issueKey,
                )
                .run()
            return (result.meta.changes ?? 0) > 0
        },

        async listForSponsor(year, issueKey) {
            const { results } = await db
                .prepare(
                    `SELECT ${COLUMNS} FROM sponsor_feedback
                     WHERE year = ? AND issue_key = ? ORDER BY created_at, rowid`,
                )
                .bind(year, issueKey)
                .all<SponsorFeedbackRow>()
            return results.map(toSponsorFeedback)
        },

        async listForYear(year) {
            const { results } = await db
                .prepare(`SELECT ${COLUMNS} FROM sponsor_feedback WHERE year = ? ORDER BY updated_at DESC, rowid DESC`)
                .bind(year)
                .all<SponsorFeedbackRow>()
            return results.map(toSponsorFeedback)
        },

        async recordRequest(year, issueKey, recipients, by) {
            await db
                .prepare(
                    `INSERT INTO sponsor_feedback_requests (year, issue_key, recipients, sent_at, sent_by)
                     VALUES (?, ?, ?, ?, ?)`,
                )
                .bind(year, issueKey, JSON.stringify(recipients), Math.floor(Date.now() / 1000), by)
                .run()
        },

        async listRequests(year) {
            const { results } = await db
                .prepare(
                    `SELECT issue_key, recipients, sent_at, sent_by FROM sponsor_feedback_requests
                     WHERE year = ? ORDER BY sent_at DESC, id DESC`,
                )
                .bind(year)
                .all<{ issue_key: string; recipients: string; sent_at: number; sent_by: string }>()
            return results.map((row) => ({
                issueKey: row.issue_key,
                recipients: JSON.parse(row.recipients) as string[],
                sentAt: row.sent_at,
                sentBy: row.sent_by,
            }))
        },
    }
}
