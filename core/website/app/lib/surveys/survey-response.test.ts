import type { SurveyConfig } from '@ddd/conference-config'
import { describe, expect, it } from 'vitest'
import type { SurveyResponse } from '~/lib/services/survey-store'
import { formatAnswer, OTHER_VALUE, parseSurveyResponse, tallySurvey } from './survey-response'

const survey = {
    slug: 's',
    title: 'S',
    description: [],
    questions: [
        { id: 'tracks', kind: 'single', label: 'Tracks', options: ['1', '2-3', '4+'], allowOther: true },
        { id: 'topics', kind: 'multiple', label: 'Topics', options: ['AI', 'Web', 'Data'], maxChoices: 2, allowOther: true },
        { id: 'hallway', kind: 'scale', label: 'Hallway', minLabel: 'Meh', maxLabel: 'Vital', required: true },
        { id: 'perfect', kind: 'text', label: 'Perfect day', long: true },
    ],
    opens: undefined,
    closes: undefined,
} as unknown as SurveyConfig

const form = (entries: Array<[string, string]>) => {
    const data = new FormData()
    for (const [key, value] of entries) data.append(key, value)
    return data
}

describe('parseSurveyResponse', () => {
    it('reads each kind of question, keeping multiple choices in the survey’s order', () => {
        const parsed = parseSurveyResponse(
            survey,
            form([
                ['q-tracks', '2-3'],
                ['q-topics', 'Data'],
                ['q-topics', 'AI'],
                ['q-hallway', '5'],
                ['q-perfect', '  Long breaks  '],
                ['email', ' Jo@Example.com '],
            ]),
        )
        expect(parsed).toEqual({
            ok: true,
            data: {
                answers: { tracks: '2-3', topics: ['AI', 'Data'], hallway: 5, perfect: 'Long breaks' },
                others: {},
                email: 'jo@example.com',
            },
        })
    })

    it('stores "Other" with its text, and leaves blank optional questions out', () => {
        const parsed = parseSurveyResponse(
            survey,
            form([
                ['q-tracks', OTHER_VALUE],
                ['q-tracks-other', 'One per floor'],
                ['q-topics', OTHER_VALUE],
                ['q-topics-other', 'Robotics'],
                ['q-hallway', '3'],
                ['q-perfect', '   '],
            ]),
        )
        expect(parsed).toEqual({
            ok: true,
            data: {
                answers: { tracks: 'Other', topics: ['Other'], hallway: 3 },
                others: { tracks: 'One per floor', topics: 'Robotics' },
                email: null,
            },
        })
    })

    it('refuses values the page never offered', () => {
        const parsed = parseSurveyResponse(
            survey,
            form([
                ['q-tracks', '17'],
                ['q-topics', 'AI'],
                ['q-topics', 'Web'],
                ['q-topics', 'Data'],
                ['q-hallway', '7'],
                ['email', 'nope'],
            ]),
        )
        expect(parsed).toEqual({
            ok: false,
            fieldErrors: {
                'q-tracks': 'Please choose one of the options.',
                'q-topics': 'Please choose up to 2.',
                'q-hallway': 'Please choose a rating from 1 to 5.',
                email: 'Please enter a valid email address, or leave it blank.',
            },
        })
    })

    it('insists on required questions only', () => {
        expect(parseSurveyResponse(survey, form([]))).toEqual({
            ok: false,
            fieldErrors: { 'q-hallway': 'Please answer this question.' },
        })
    })

    it('refuses a submission that answers nothing, even with an email', () => {
        const optionalOnly = { ...survey, questions: survey.questions.filter((q) => !q.required) }
        expect(parseSurveyResponse(optionalOnly, form([['email', 'jo@example.com']]))).toEqual({
            ok: false,
            fieldErrors: { _form: 'Please answer at least one question before sending.' },
        })
    })

    it('ignores an email field when the survey does not ask for one', () => {
        const parsed = parseSurveyResponse(
            { ...survey, askForEmail: false },
            form([
                ['q-hallway', '4'],
                ['email', 'jo@example.com'],
            ]),
        )
        expect(parsed.ok && parsed.data.email).toBe(null)
    })
})

describe('tallySurvey', () => {
    const response = (answers: SurveyResponse['answers'], others: SurveyResponse['others'] = {}): SurveyResponse => ({
        id: crypto.randomUUID(),
        answers,
        others,
        email: null,
        submittedAt: 0,
    })
    const responses = [
        response({ tracks: '2-3', topics: ['AI', 'Data'], hallway: 5, perfect: 'Coffee' }),
        response({ tracks: '2-3', topics: ['AI'], hallway: 4 }),
        response({ tracks: 'Other', hallway: 4 }, { tracks: 'Ten!' }),
        response({ tracks: 'Retired option', hallway: 2 }),
    ]

    it('counts every option, including ones nobody picked and ones since removed', () => {
        expect(tallySurvey(survey, responses).tracks).toEqual({
            kind: 'choice',
            answered: 4,
            counts: [
                { option: '1', count: 0 },
                { option: '2-3', count: 2 },
                { option: '4+', count: 0 },
                { option: 'Other', count: 1 },
                { option: 'Retired option', count: 1 },
            ],
            others: ['Ten!'],
        })
        expect(tallySurvey(survey, responses).topics).toMatchObject({
            answered: 2,
            counts: expect.arrayContaining([
                { option: 'AI', count: 2 },
                { option: 'Data', count: 1 },
            ]),
        })
    })

    it('averages scales and collects free text', () => {
        const tally = tallySurvey(survey, responses)
        expect(tally.hallway).toEqual({ kind: 'scale', answered: 4, average: 3.8, distribution: [0, 1, 0, 2, 1] })
        expect(tally.perfect).toEqual({ kind: 'text', answered: 1, answers: ['Coffee'] })
    })

    it('formats an answer for a table cell', () => {
        expect(formatAnswer(responses[0], survey.questions[1])).toBe('AI; Data')
        expect(formatAnswer(responses[2], survey.questions[0])).toBe('Other (Ten!)')
        expect(formatAnswer(responses[1], survey.questions[3])).toBe('')
    })
})
