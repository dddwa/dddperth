import type { ConferenceFeedback, TalkFeedback } from '~/lib/services/feedback-store'
import type { FeedbackTarget } from './feedback-targets'

export interface RatingSummary {
    count: number
    /** Mean rating to one decimal place, or null with no responses. */
    average: number | null
    /** Responses per rating: index 0 is ★1, index 4 is ★5. */
    distribution: [number, number, number, number, number]
}

export interface TalkSummaryRow extends RatingSummary {
    targetId: string
    /** Undefined when the talk is no longer on the agenda. */
    target: FeedbackTarget | undefined
}

export interface TalkFeedbackRow extends TalkFeedback {
    target: FeedbackTarget | undefined
}

export interface FeedbackReport {
    conference: RatingSummary
    conferenceResponses: ConferenceFeedback[]
    /** One row per talk on the agenda (responses or not), then any orphaned ids, in agenda order. */
    talks: TalkSummaryRow[]
    /** Every talk response, in agenda order, newest first within a talk. */
    talkResponses: TalkFeedbackRow[]
}

export function summariseRatings(ratings: number[]): RatingSummary {
    const distribution: RatingSummary['distribution'] = [0, 0, 0, 0, 0]
    for (const rating of ratings) {
        if (rating >= 1 && rating <= 5) distribution[rating - 1]++
    }
    const total = ratings.reduce((sum, rating) => sum + rating, 0)
    return {
        count: ratings.length,
        average: ratings.length ? Math.round((total / ratings.length) * 10) / 10 : null,
        distribution,
    }
}

/**
 * Joins stored feedback to the agenda as it is *now*: titles, times and
 * speakers are never stored with a response, so a corrected title shows up
 * here and in the export without touching the data.
 */
export function buildFeedbackReport(
    targets: FeedbackTarget[],
    conferenceResponses: ConferenceFeedback[],
    talkResponses: TalkFeedback[],
): FeedbackReport {
    const order = new Map(targets.map((target, index) => [target.id, index]))
    const targetById = new Map(targets.map((target) => [target.id, target]))
    const rank = (id: string) => order.get(id) ?? Number.MAX_SAFE_INTEGER

    const ratingsByTarget = new Map<string, number[]>(targets.map((target) => [target.id, []]))
    for (const response of talkResponses) {
        const ratings = ratingsByTarget.get(response.targetId) ?? []
        ratings.push(response.rating)
        ratingsByTarget.set(response.targetId, ratings)
    }

    const talks = Array.from(ratingsByTarget, ([targetId, ratings]) => ({
        targetId,
        target: targetById.get(targetId),
        ...summariseRatings(ratings),
    })).sort((a, b) => rank(a.targetId) - rank(b.targetId) || a.targetId.localeCompare(b.targetId))

    const responses = talkResponses
        .map((response) => ({ ...response, target: targetById.get(response.targetId) }))
        .sort(
            (a, b) =>
                rank(a.targetId) - rank(b.targetId) ||
                a.targetId.localeCompare(b.targetId) ||
                b.submittedAt - a.submittedAt,
        )

    return {
        conference: summariseRatings(conferenceResponses.map((response) => response.rating)),
        conferenceResponses,
        talks,
        talkResponses: responses,
    }
}
