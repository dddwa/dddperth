import { conferenceInstant } from '~/lib/dates/temporal'
import { writeXlsx } from '~/lib/xlsx-writer'
import type { FeedbackReport } from './feedback-report'

/**
 * The admin feedback export: one sheet per view on the admin page. Cells are
 * written as typed values (strings stay strings), so free text that starts
 * with `=` can't become a formula the way it could in a CSV.
 */
export function buildFeedbackWorkbook(report: FeedbackReport, timezone?: string): Uint8Array<ArrayBuffer> {
    const submitted = (seconds: number) =>
        conferenceInstant(seconds * 1000, { timeZone: timezone }).toPlainDateTime().toString({ smallestUnit: 'minute' }).replace('T', ' ')

    return writeXlsx([
        {
            name: 'Conference',
            rows: [
                [
                    'Rating',
                    'Why come / best thing',
                    'Ideas or suggestions',
                    'Meet the Experts',
                    'Other feedback',
                    'Email',
                    'Submitted',
                ],
                ...report.conferenceResponses.map((response) => [
                    response.rating,
                    response.bestThing ?? '',
                    response.ideas ?? '',
                    response.meetTheExperts ?? '',
                    response.feedback ?? '',
                    response.email ?? '',
                    submitted(response.submittedAt),
                ]),
            ],
        },
        {
            name: 'Talk summary',
            rows: [
                ['Time', 'Talk', 'Speakers', 'Room', 'Responses', 'Average', '★1', '★2', '★3', '★4', '★5'],
                ...report.talks.map((row) => [
                    row.target?.time ?? '',
                    row.target?.title ?? `No longer on the agenda (${row.targetId})`,
                    row.target?.speakers ?? '',
                    row.target?.room ?? '',
                    row.count,
                    row.average ?? '',
                    ...row.distribution,
                ]),
            ],
        },
        {
            name: 'Talk feedback',
            rows: [
                [
                    'Time',
                    'Talk',
                    'Speakers',
                    'Room',
                    'Rating',
                    'Feedback for speaker',
                    'For organisers only',
                    'Email',
                    'Submitted',
                ],
                ...report.talkResponses.map((response) => [
                    response.target?.time ?? '',
                    response.target?.title ?? `No longer on the agenda (${response.targetId})`,
                    response.target?.speakers ?? '',
                    response.target?.room ?? '',
                    response.rating,
                    response.speakerFeedback ?? '',
                    response.organiserFeedback ?? '',
                    response.email ?? '',
                    submitted(response.submittedAt),
                ]),
            ],
        },
    ])
}
