import {
    PRESENTATION_DETAIL_OPTIONS,
    QUESTIONS_PREFERENCE_OPTIONS,
    YES_NO_MAYBE_OTHER_OPTIONS,
    type PresentationDetail,
    type QuestionsPreference,
    type SessionDetailsInput,
    type SpeakerProfileInput,
    type YesNoMaybeOther,
} from '../services/speakers-store'

export function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
}

function oneOf<T extends string>(value: FormDataEntryValue | null, options: readonly T[]): T | undefined {
    return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : undefined
}

function allOf<T extends string>(values: FormDataEntryValue[], options: readonly T[]): T[] {
    return values.filter((v): v is T => typeof v === 'string' && (options as readonly string[]).includes(v))
}

/** Meet-the-Experts slot ids are fork-configured (not a fixed core enum), so
 * unlike `allOf` this just collects whatever string values were checked. */
export function allStrings(values: FormDataEntryValue[]): string[] {
    return values.filter((v): v is string => typeof v === 'string')
}

export interface MeetTheExpertsFormInput {
    slots: string[]
    bioUseSessionizeBio: boolean
    bioCustomText?: string
}

/**
 * Parses the "Meet the Experts" modal's combined form (slot checkboxes +
 * the "use Sessionize bio or write a custom one" bio field, same idiom as
 * the session-details introduction) into what `saveMeetTheExpertsSlots`
 * accepts. Shared by the speaker's own action and the admin preview's.
 */
export function parseMeetTheExpertsForm(formData: FormData): MeetTheExpertsFormInput {
    return {
        slots: allStrings(formData.getAll('registerMeetTheExpertsSlots')),
        bioUseSessionizeBio: formData.get('meetTheExpertsBioSource') !== 'custom',
        bioCustomText: emptyToUndefined(formData.get('meetTheExpertsBioCustomText')),
    }
}

/**
 * Parses one presenter's fields out of the session-details modal's combined
 * form (`SpeakerProfileForm`) into a `SpeakerProfileInput` — field names are
 * suffixed with `sessionizeId` since the modal submits every presenter (and
 * every session) as one form with a single "Save" button, so each
 * presenter's fields need distinct names. Shared by the speaker's own
 * `/speaker-portal` action and the admin `/admin/speakers/$sessionizeId`
 * action, so editing on a speaker's behalf can never drift from what the
 * speaker themselves submits. Doesn't cover the session-level fields (see
 * `parseSessionDetailsForm`) or the RSVPs, which all have their own
 * dedicated parse-and-save paths.
 */
export function parseSpeakerProfileForm(formData: FormData, sessionizeId: string): SpeakerProfileInput {
    return {
        namePhoneticSpelling: emptyToUndefined(formData.get(`namePhoneticSpelling-${sessionizeId}`)),
        introductionUseSessionizeBio: formData.get(`introductionSource-${sessionizeId}`) !== 'custom',
        introductionCustomText: emptyToUndefined(formData.get(`introductionCustomText-${sessionizeId}`)),
        registerMeetTheExperts: oneOf<YesNoMaybeOther>(
            formData.get(`registerMeetTheExperts-${sessionizeId}`),
            YES_NO_MAYBE_OTHER_OPTIONS,
        ),
        registerMeetTheExpertsOther: emptyToUndefined(formData.get(`registerMeetTheExpertsOther-${sessionizeId}`)),
    }
}

/**
 * Parses one session's fields out of the session-details modal's combined
 * form (`SessionDetailsForm`) into a `SessionDetailsInput` — audience
 * questions, presentation format, recording opt-out and "anything else",
 * shared by every presenter on the session rather than asked of each
 * individually. Field names are suffixed with `sessionizeSessionId`, same
 * reasoning as `parseSpeakerProfileForm`.
 */
export function parseSessionDetailsForm(formData: FormData, sessionizeSessionId: string): SessionDetailsInput {
    return {
        questionsPreference: oneOf<QuestionsPreference>(
            formData.get(`questionsPreference-${sessionizeSessionId}`),
            QUESTIONS_PREFERENCE_OPTIONS,
        ),
        questionsPreferenceOther: emptyToUndefined(formData.get(`questionsPreferenceOther-${sessionizeSessionId}`)),
        presentationDetails: allOf<PresentationDetail>(
            formData.getAll(`presentationDetails-${sessionizeSessionId}`),
            PRESENTATION_DETAIL_OPTIONS,
        ),
        presentationDetailsOther: emptyToUndefined(formData.get(`presentationDetailsOther-${sessionizeSessionId}`)),
        optOutOfRecording: formData.get(`optOutOfRecording-${sessionizeSessionId}`) === 'yes',
        anythingElse: emptyToUndefined(formData.get(`anythingElse-${sessionizeSessionId}`)),
    }
}
