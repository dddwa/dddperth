export interface SponsorFeedbackInput {
    /** 1–5, or null when the sponsor skipped it. */
    rating: number | null
    experience: string | null
    ideas: string | null
    testimonial: string | null
    /** Name and role to credit the testimonial to. */
    testimonialAttribution: string | null
    /** The sponsor has agreed we may publish the testimonial. */
    testimonialConsent: boolean
    portalFeedback: string | null
}

export interface SponsorFeedback extends SponsorFeedbackInput {
    id: string
    issueKey: string
    submittedBy: string
    updatedBy: string
    /** Unix seconds. */
    createdAt: number
    updatedAt: number
}

export interface SponsorFeedbackRequest {
    issueKey: string
    recipients: string[]
    /** Unix seconds. */
    sentAt: number
    sentBy: string
}

export interface SponsorFeedbackStore {
    /** Returns the new submission's id. */
    create(year: string, issueKey: string, input: SponsorFeedbackInput, by: string): Promise<string>
    /**
     * Scoped by issue key as well as id, so one sponsor can never edit
     * another's submission by guessing an id. False when nothing matched.
     */
    update(issueKey: string, id: string, input: SponsorFeedbackInput, by: string): Promise<boolean>
    /** Oldest first, so a sponsor reads their submissions in the order they wrote them. */
    listForSponsor(year: string, issueKey: string): Promise<SponsorFeedback[]>
    /** Every sponsor's feedback for the year, newest first. */
    listForYear(year: string): Promise<SponsorFeedback[]>

    recordRequest(year: string, issueKey: string, recipients: string[], by: string): Promise<void>
    /** Newest first. */
    listRequests(year: string): Promise<SponsorFeedbackRequest[]>
}
