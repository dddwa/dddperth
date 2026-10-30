import { describe, expect, it } from 'vitest'
import { buildFeedbackReport, summariseRatings } from './feedback-report'
import type { FeedbackTarget } from './feedback-targets'

const target = (id: string, title: string): FeedbackTarget => ({
    id,
    kind: 'talk',
    title,
    speakers: '',
    time: '',
    room: '',
    label: title,
})

const response = (targetId: string, rating: number, submittedAt: number) => ({
    id: `${targetId}-${submittedAt}`,
    targetId,
    rating,
    speakerFeedback: null,
    organiserFeedback: null,
    email: null,
    submittedAt,
})

describe('summariseRatings', () => {
    it('averages to one decimal and counts each star', () => {
        expect(summariseRatings([5, 4, 4])).toEqual({ count: 3, average: 4.3, distribution: [0, 0, 0, 2, 1] })
        expect(summariseRatings([])).toEqual({ count: 0, average: null, distribution: [0, 0, 0, 0, 0] })
    })
})

describe('buildFeedbackReport', () => {
    it('lists every talk in agenda order, including ones with no feedback, and keeps orphaned responses', () => {
        const report = buildFeedbackReport(
            [target('a', 'First'), target('b', 'Second')],
            [],
            [response('b', 5, 1), response('gone', 2, 2), response('b', 3, 3)],
        )

        expect(report.talks.map((t) => [t.targetId, t.target?.title, t.count, t.average])).toEqual([
            ['a', 'First', 0, null],
            ['b', 'Second', 2, 4],
            ['gone', undefined, 1, 2],
        ])
        expect(report.talkResponses.map((r) => r.id)).toEqual(['b-3', 'b-1', 'gone-2'])
    })
})
