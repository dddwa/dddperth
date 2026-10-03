import { DateTime } from 'luxon'
import { utils as sheetUtils, write as writeWorkbook } from 'xlsx'
import type { FeedbackReport } from './feedback-report'

/**
 * The admin feedback export: one sheet per view on the admin page. Cells are
 * written as typed values (strings stay strings), so free text that starts
 * with `=` can't become a formula the way it could in a CSV.
 */
export function buildFeedbackWorkbook(report: FeedbackReport, timezone: string): ArrayBuffer {
    const submitted = (seconds: number) =>
        DateTime.fromSeconds(seconds, { zone: timezone }).toFormat('yyyy-MM-dd HH:mm')
    const workbook = sheetUtils.book_new()

    sheetUtils.book_append_sheet(
        workbook,
        sheetUtils.json_to_sheet(
            report.conferenceResponses.map((response) => ({
                Rating: response.rating,
                'Why come / best thing': response.bestThing ?? '',
                'Ideas or suggestions': response.ideas ?? '',
                'Meet the Experts': response.meetTheExperts ?? '',
                'Other feedback': response.feedback ?? '',
                Email: response.email ?? '',
                Submitted: submitted(response.submittedAt),
            })),
            {
                header: [
                    'Rating',
                    'Why come / best thing',
                    'Ideas or suggestions',
                    'Meet the Experts',
                    'Other feedback',
                    'Email',
                    'Submitted',
                ],
            },
        ),
        'Conference',
    )

    sheetUtils.book_append_sheet(
        workbook,
        sheetUtils.json_to_sheet(
            report.talks.map((row) => ({
                Time: row.target?.time ?? '',
                Talk: row.target?.title ?? `No longer on the agenda (${row.targetId})`,
                Speakers: row.target?.speakers ?? '',
                Room: row.target?.room ?? '',
                Responses: row.count,
                Average: row.average ?? '',
                '★1': row.distribution[0],
                '★2': row.distribution[1],
                '★3': row.distribution[2],
                '★4': row.distribution[3],
                '★5': row.distribution[4],
            })),
            { header: ['Time', 'Talk', 'Speakers', 'Room', 'Responses', 'Average', '★1', '★2', '★3', '★4', '★5'] },
        ),
        'Talk summary',
    )

    sheetUtils.book_append_sheet(
        workbook,
        sheetUtils.json_to_sheet(
            report.talkResponses.map((response) => ({
                Time: response.target?.time ?? '',
                Talk: response.target?.title ?? `No longer on the agenda (${response.targetId})`,
                Speakers: response.target?.speakers ?? '',
                Room: response.target?.room ?? '',
                Rating: response.rating,
                'Feedback for speaker': response.speakerFeedback ?? '',
                'For organisers only': response.organiserFeedback ?? '',
                Email: response.email ?? '',
                Submitted: submitted(response.submittedAt),
            })),
            {
                header: [
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
            },
        ),
        'Talk feedback',
    )

    const bytes: unknown = writeWorkbook(workbook, { type: 'array', bookType: 'xlsx' })
    if (!(bytes instanceof ArrayBuffer)) throw new Error('xlsx did not return an ArrayBuffer')
    return bytes
}
