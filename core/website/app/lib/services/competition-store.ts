export interface CompetitionEntryInput {
    name: string
    /** Lowercased, as entered. */
    email: string
    /** `email` normalised for duplicate detection; see `emailKey()`. */
    emailKey: string
    answer: string
}

export interface CompetitionEntry extends Omit<CompetitionEntryInput, 'emailKey'> {
    id: string
    /** Unix seconds. */
    submittedAt: number
}

export interface CompetitionStore {
    /**
     * One entry per email per competition. Returns false, and changes nothing,
     * if this email (after normalisation) has already entered.
     */
    saveEntry(competitionSlug: string, input: CompetitionEntryInput): Promise<boolean>
    /** Oldest first, so the order matches the order people entered. */
    listEntries(competitionSlug: string): Promise<CompetitionEntry[]>
    /** Entry count per competition slug; slugs with no entries are absent. */
    countEntries(): Promise<Record<string, number>>
}
