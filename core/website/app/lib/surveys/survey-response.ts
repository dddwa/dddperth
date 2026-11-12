import type { SurveyConfig, SurveyQuestion } from '@ddd/conference-config'
import { isValidEmail } from '~/lib/auth/validation'
import type { SurveyAnswer, SurveyResponse, SurveyResponseInput } from '~/lib/services/survey-store'

/** The radio/checkbox value meaning "Other"; the stored answer says `OTHER_LABEL` instead. */
export const OTHER_VALUE = '__other'
export const OTHER_LABEL = 'Other'
export const EMAIL_FIELD = 'email'
export const MAX_SHORT_TEXT = 500
export const MAX_LONG_TEXT = 5000
export const SCALE_POINTS = [1, 2, 3, 4, 5] as const

/** Form field names, namespaced so a question id can never collide with the spam-check fields. */
export const fieldName = (question: Pick<SurveyQuestion, 'id'>) => `q-${question.id}`
export const otherFieldName = (question: Pick<SurveyQuestion, 'id'>) => `q-${question.id}-other`

export function findSurvey(surveys: readonly SurveyConfig[] | undefined, slug: string | undefined) {
    if (!slug) return undefined
    return surveys?.find((survey) => survey.slug === slug)
}

export type ParsedSurveyResponse = { ok: true; data: SurveyResponseInput } | { ok: false; fieldErrors: Record<string, string> }

const textOf = (formData: FormData, name: string) => {
    const value = formData.get(name)
    return typeof value === 'string' ? value.trim() : ''
}

/**
 * Reads a survey submission against the survey's own questions. Anything not
 * offered on the page — an unknown option, a rating of 7, a sixth choice when
 * five are allowed — is an error rather than being stored, so the tallies only
 * ever count real options. Field errors are keyed by `fieldName(question)`.
 */
export function parseSurveyResponse(survey: SurveyConfig, formData: FormData): ParsedSurveyResponse {
    const answers: Record<string, SurveyAnswer> = {}
    const others: Record<string, string> = {}
    const fieldErrors: Record<string, string> = {}

    for (const question of survey.questions) {
        const name = fieldName(question)
        const error = (message: string) => {
            fieldErrors[name] ??= message
        }

        switch (question.kind) {
            case 'single': {
                const value = textOf(formData, name)
                if (!value) break
                if (value === OTHER_VALUE && question.allowOther) {
                    answers[question.id] = OTHER_LABEL
                    const other = textOf(formData, otherFieldName(question))
                    if (other.length > MAX_SHORT_TEXT) error(`Please keep this under ${MAX_SHORT_TEXT} characters.`)
                    else if (other) others[question.id] = other
                } else if (question.options.includes(value)) {
                    answers[question.id] = value
                } else {
                    error('Please choose one of the options.')
                }
                break
            }
            case 'multiple': {
                const values = [...new Set(formData.getAll(name).filter((v): v is string => typeof v === 'string'))]
                if (!values.length) break
                const chosen: string[] = []
                for (const value of values) {
                    if (value === OTHER_VALUE && question.allowOther) chosen.push(OTHER_LABEL)
                    else if (question.options.includes(value)) chosen.push(value)
                    else error('Please choose from the options shown.')
                }
                if (question.maxChoices && chosen.length > question.maxChoices) {
                    error(`Please choose up to ${question.maxChoices}.`)
                }
                if (chosen.includes(OTHER_LABEL)) {
                    const other = textOf(formData, otherFieldName(question))
                    if (other.length > MAX_SHORT_TEXT) error(`Please keep this under ${MAX_SHORT_TEXT} characters.`)
                    else if (other) others[question.id] = other
                }
                // Stored in the survey's own option order, whatever order the browser sent them in.
                answers[question.id] = [...question.options, OTHER_LABEL].filter((option) => chosen.includes(option))
                break
            }
            case 'scale': {
                const value = textOf(formData, name)
                if (!value) break
                if (/^[1-5]$/.test(value)) answers[question.id] = Number(value)
                else error('Please choose a rating from 1 to 5.')
                break
            }
            case 'text': {
                const value = textOf(formData, name)
                const max = question.long ? MAX_LONG_TEXT : MAX_SHORT_TEXT
                if (value.length > max) error(`Please keep this under ${max} characters.`)
                else if (value) answers[question.id] = value
                break
            }
        }

        const answer = answers[question.id]
        const answered = answer !== undefined && !(Array.isArray(answer) && answer.length === 0)
        if (!answered) delete answers[question.id]
        if (question.required && !answered) error('Please answer this question.')
    }

    let email: string | null = null
    if (survey.askForEmail ?? true) {
        email = textOf(formData, EMAIL_FIELD).toLowerCase() || null
        if (email && !isValidEmail(email)) {
            fieldErrors[EMAIL_FIELD] = 'Please enter a valid email address, or leave it blank.'
        }
    }

    if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors }
    // A blank submission tells us nothing and would only inflate the response count.
    if (!Object.keys(answers).length) {
        return { ok: false, fieldErrors: { _form: 'Please answer at least one question before sending.' } }
    }
    return { ok: true, data: { answers, others, email } }
}

export type QuestionTally =
    | { kind: 'choice'; answered: number; counts: Array<{ option: string; count: number }>; others: string[] }
    | { kind: 'scale'; answered: number; average: number | null; distribution: number[] }
    | { kind: 'text'; answered: number; answers: string[] }

/**
 * Per-question summary for the admin page. Choice counts follow the survey's
 * option order and include zero-count options, so a choice nobody picked is
 * visible as such; an answer naming an option that's since been removed from
 * the config is still counted, after the current ones.
 */
export function tallySurvey(survey: SurveyConfig, responses: SurveyResponse[]): Record<string, QuestionTally> {
    const tallies: Record<string, QuestionTally> = {}

    for (const question of survey.questions) {
        const answers = responses.map((response) => response.answers[question.id]).filter((a) => a !== undefined)

        if (question.kind === 'single' || question.kind === 'multiple') {
            const counts = new Map<string, number>(question.options.map((option) => [option, 0]))
            if (question.allowOther) counts.set(OTHER_LABEL, 0)
            for (const answer of answers) {
                for (const option of Array.isArray(answer) ? answer : [String(answer)]) {
                    counts.set(option, (counts.get(option) ?? 0) + 1)
                }
            }
            tallies[question.id] = {
                kind: 'choice',
                answered: answers.length,
                counts: [...counts].map(([option, count]) => ({ option, count })),
                others: responses.flatMap((response) => response.others[question.id] ?? []),
            }
        } else if (question.kind === 'scale') {
            const ratings = answers.filter((a): a is number => typeof a === 'number')
            const distribution = SCALE_POINTS.map((point) => ratings.filter((r) => r === point).length)
            const average = ratings.length
                ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10
                : null
            tallies[question.id] = { kind: 'scale', answered: ratings.length, average, distribution }
        } else {
            const texts = answers.filter((a): a is string => typeof a === 'string')
            tallies[question.id] = { kind: 'text', answered: texts.length, answers: texts }
        }
    }

    return tallies
}

/** One cell's worth of an answer, for the admin table and export. */
export function formatAnswer(response: SurveyResponse, question: SurveyQuestion): string {
    const answer = response.answers[question.id]
    if (answer === undefined) return ''
    const text = Array.isArray(answer) ? answer.join('; ') : String(answer)
    const other = response.others[question.id]
    return other ? `${text} (${other})` : text
}
