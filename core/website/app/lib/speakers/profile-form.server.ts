import {
    PRESENTATION_DETAIL_OPTIONS,
    QUESTIONS_PREFERENCE_OPTIONS,
    YES_NO_MAYBE_OTHER_OPTIONS,
    type PresentationDetail,
    type QuestionsPreference,
    type SpeakerProfileInput,
    type YesNoMaybeOther,
} from '../services/speakers-store'

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
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
function allStrings(values: FormDataEntryValue[]): string[] {
    return values.filter((v): v is string => typeof v === 'string')
}

/**
 * Parses the session-details modal (`SpeakerProfileForm`) into a
 * `SpeakerProfileInput`. Shared by the speaker's own `/speaker-portal` action
 * and the admin `/admin/speakers/$sessionizeId` action, so editing on a
 * speaker's behalf can never drift from what the speaker themselves submits.
 * Doesn't cover the training/dinner RSVPs — those have their own dedicated
 * parse-and-save paths (`rsvp-training` / `rsvp-dinner` actions).
 */
export function parseSpeakerProfileForm(formData: FormData): SpeakerProfileInput {
    return {
        namePhoneticSpelling: emptyToUndefined(formData.get('namePhoneticSpelling')),
        questionsPreference: oneOf<QuestionsPreference>(formData.get('questionsPreference'), QUESTIONS_PREFERENCE_OPTIONS),
        questionsPreferenceOther: emptyToUndefined(formData.get('questionsPreferenceOther')),
        presentationDetails: allOf<PresentationDetail>(
            formData.getAll('presentationDetails'),
            PRESENTATION_DETAIL_OPTIONS,
        ),
        presentationDetailsOther: emptyToUndefined(formData.get('presentationDetailsOther')),
        optOutOfRecording: formData.get('optOutOfRecording') === 'yes',
        introductionUseSessionizeBio: formData.get('introductionSource') !== 'custom',
        introductionCustomText: emptyToUndefined(formData.get('introductionCustomText')),
        anythingElse: emptyToUndefined(formData.get('anythingElse')),
        dietaryRequirements: emptyToUndefined(formData.get('dietaryRequirements')),
        registerMeetTheExperts: oneOf<YesNoMaybeOther>(formData.get('registerMeetTheExperts'), YES_NO_MAYBE_OTHER_OPTIONS),
        registerMeetTheExpertsOther: emptyToUndefined(formData.get('registerMeetTheExpertsOther')),
        registerMeetTheExpertsSlots: allStrings(formData.getAll('registerMeetTheExpertsSlots')),
    }
}
