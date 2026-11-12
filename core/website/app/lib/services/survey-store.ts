/** A single-choice or text answer is a string, multiple choice a string array, a scale a number. */
export type SurveyAnswer = string | string[] | number

export interface SurveyResponseInput {
    /** By question id. Questions left blank are absent. */
    answers: Record<string, SurveyAnswer>
    /** What was typed into an "Other" box, by question id. */
    others: Record<string, string>
    email: string | null
}

export interface SurveyResponse extends SurveyResponseInput {
    id: string
    /** Unix seconds. */
    submittedAt: number
}

export interface SurveyStore {
    /** Every response is kept. */
    saveResponse(surveySlug: string, input: SurveyResponseInput): Promise<void>
    /** Oldest first. */
    listResponses(surveySlug: string): Promise<SurveyResponse[]>
    /** Response count per survey slug; slugs with no responses are absent. */
    countResponses(): Promise<Record<string, number>>
}
