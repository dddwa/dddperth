/**
 * Meet-the-Experts registration storage. Either a speaker or a sponsor can
 * register a person for a configured time slot — see `meetTheExperts` on the
 * conference manifest for the slot list. One row per registrant
 * (registrantType, registrantId): sessionize_id for a speaker, issue_key for
 * a sponsor. Speakers additionally answer a preliminary opt-in question
 * (Yes/No/Maybe/Other) that lives on `SpeakerProfile` — unrelated to this
 * store, which only holds the actual registration.
 */

export type MeetTheExpertsRegistrantType = 'speaker' | 'sponsor'

export interface MeetTheExpertsRegistration {
    registrantType: MeetTheExpertsRegistrantType
    registrantId: string
    /** Configured slot ids the registrant wants — may be empty ("none work
     * for me" is still a deliberate, complete answer). */
    slots: string[]
    /** True = use the registrant's default bio text (a speaker's Sessionize
     * bio, or a sponsor's submitted company blurb); false = bioCustomText. */
    bioUseDefault: boolean
    bioCustomText?: string
    /** Stamped every time the registration is (re)submitted. */
    respondedAt: number
    updatedAt: number
    updatedBy: string
}

export interface MeetTheExpertsStore {
    getRegistration(
        registrantType: MeetTheExpertsRegistrantType,
        registrantId: string,
    ): Promise<MeetTheExpertsRegistration | null>

    /** Every registration on file, speaker and sponsor alike — for the admin
     * scheduling grid, which needs everyone's preferences at once rather
     * than one lookup per person. */
    listRegistrations(): Promise<MeetTheExpertsRegistration[]>

    /** Overwrites the selection and re-stamps respondedAt every call — an
     * empty slot selection is still a deliberate, complete answer. */
    saveRegistration(
        registrantType: MeetTheExpertsRegistrantType,
        registrantId: string,
        details: { slots: string[]; bioUseDefault: boolean; bioCustomText?: string },
        updatedBy: string,
    ): Promise<void>
}
