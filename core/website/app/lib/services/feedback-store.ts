export interface ConferenceFeedbackInput {
    rating: number
    bestThing: string | null
    ideas: string | null
    feedback: string | null
    email: string | null
}

export interface ConferenceFeedback extends ConferenceFeedbackInput {
    id: string
    /** Unix seconds of the latest (re)submission. */
    submittedAt: number
}

export interface TalkFeedbackInput {
    /** A Sessionize session id, or a Meet the Experts `mte-…` id. */
    targetId: string
    rating: number
    /** Passed on to the speaker once the committee has read it. */
    speakerFeedback: string | null
    /** For organisers only. */
    organiserFeedback: string | null
    email: string | null
}

export interface TalkFeedback extends TalkFeedbackInput {
    id: string
    submittedAt: number
}

export interface FeedbackStore {
    /** One response per browser per year: a resubmission replaces the earlier one. */
    saveConferenceFeedback(year: string, submitterId: string, input: ConferenceFeedbackInput): Promise<void>
    /** One response per browser per talk per year: a resubmission replaces the earlier one. */
    saveTalkFeedback(year: string, submitterId: string, input: TalkFeedbackInput): Promise<void>
    /** Newest first. */
    listConferenceFeedback(year: string): Promise<ConferenceFeedback[]>
    /** Newest first. */
    listTalkFeedback(year: string): Promise<TalkFeedback[]>
}
