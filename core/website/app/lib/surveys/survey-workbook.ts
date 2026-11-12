import type { SurveyConfig } from '@ddd/conference-config'
import { conferenceInstant } from '~/lib/dates/temporal'
import type { SurveyResponse } from '~/lib/services/survey-store'
import { writeXlsx } from '~/lib/xlsx-writer'
import { formatAnswer, tallySurvey } from './survey-response'

/**
 * Two sheets: every response (one column per question), and the tallies.
 * .xlsx rather than CSV so free text starting with `=` stays text.
 */
export function buildSurveyWorkbook(
    survey: SurveyConfig,
    responses: SurveyResponse[],
    timezone?: string,
): Uint8Array<ArrayBuffer> {
    const submitted = (seconds: number) =>
        conferenceInstant(seconds * 1000, { timeZone: timezone })
            .toPlainDateTime()
            .toString({ smallestUnit: 'minute' })
            .replace('T', ' ')
    const tallies = tallySurvey(survey, responses)

    const summary: Array<Array<string | number>> = [['Question', 'Answer', 'Count']]
    for (const question of survey.questions) {
        const tally = tallies[question.id]
        if (tally.kind === 'choice') {
            for (const { option, count } of tally.counts) summary.push([question.label, option, count])
            for (const other of tally.others) summary.push([question.label, `Other: ${other}`, ''])
        } else if (tally.kind === 'scale') {
            summary.push([question.label, 'Average (1–5)', tally.average ?? ''])
            tally.distribution.forEach((count, index) => summary.push([question.label, String(index + 1), count]))
        } else {
            summary.push([question.label, 'Responses (see the Responses sheet)', tally.answered])
        }
    }

    return writeXlsx([
        {
            name: 'Responses',
            rows: [
                [...survey.questions.map((question) => question.label), 'Email', 'Submitted'],
                ...responses.map((response) => [
                    ...survey.questions.map((question) => formatAnswer(response, question)),
                    response.email ?? '',
                    submitted(response.submittedAt),
                ]),
            ],
        },
        { name: 'Summary', rows: summary },
    ])
}
