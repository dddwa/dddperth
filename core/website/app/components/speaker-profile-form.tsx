import { useNavigation } from 'react-router'
import type { ReactNode } from 'react'
import {
    PRESENTATION_DETAIL_OPTIONS,
    SPEAKER_TRAINING_SESSION_OPTIONS,
    type SpeakerProfile,
} from '~/lib/services/speakers-store'
import { AdminCard } from '~/components/admin-card'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

const inputClass = css({
    mt: '1',
    w: 'full',
    px: '3',
    py: '2',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'md',
    fontSize: 'sm',
    bg: 'white',
    color: 'admin.900',
    _placeholder: { color: 'admin.400' },
    _focus: { outline: 'none', borderColor: 'indigo.7', boxShadow: 'focus-ring' },
})

const fieldLabelClass = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.700',
})

const checkboxRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'sm',
    color: 'admin.800',
})

function PrimaryButton({ children, disabled }: { children: ReactNode; disabled?: boolean }) {
    return (
        <styled.button
            type="submit"
            disabled={disabled}
            bg="admin.900"
            color="white"
            border="none"
            py="2.5"
            px="6"
            borderRadius="md"
            fontSize="sm"
            fontWeight="semibold"
            cursor="pointer"
            transition="colors"
            _hover={{ bg: 'admin.800' }}
            _disabled={{ bg: 'admin.400', cursor: 'not-allowed', opacity: 0.8 }}
        >
            {children}
        </styled.button>
    )
}

/**
 * Extra-info form for one speaker (self or a co-presenter — either can fill
 * this in for the other; see requireSpeaker/getCoPresenterIds). Submits to
 * the current route's action with `_action=save-profile` and a hidden
 * `targetSessionizeId`, so multiple copies of this form (one per presenter)
 * can sit on the same dashboard page.
 */
export function SpeakerProfileForm({
    sessionizeId,
    fullName,
    profile,
    justSaved,
}: {
    sessionizeId: string
    fullName: string
    profile: SpeakerProfile | null
    justSaved: boolean
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('targetSessionizeId') === sessionizeId

    return (
        <AdminCard>
            <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                {fullName}'s info
            </styled.h2>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Everything here is separate from Sessionize — it goes straight to the organisers for the run sheet.
            </styled.p>

            {justSaved && (
                <Box mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    Saved — thank you!
                </Box>
            )}

            <styled.form method="post">
                <input type="hidden" name="_action" value="save-profile" />
                <input type="hidden" name="targetSessionizeId" value={sessionizeId} />

                <Box mb="5">
                    <label htmlFor={`namePhonetic-${sessionizeId}`} className={fieldLabelClass}>
                        Name phonetic spelling
                    </label>
                    <input
                        id={`namePhonetic-${sessionizeId}`}
                        name="namePhoneticSpelling"
                        type="text"
                        defaultValue={profile?.namePhoneticSpelling ?? ''}
                        placeholder="e.g. KWEN-tin CHEE"
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <label htmlFor={`questions-${sessionizeId}`} className={fieldLabelClass}>
                        Will you take audience questions?
                    </label>
                    <select
                        id={`questions-${sessionizeId}`}
                        name="questionsPreference"
                        defaultValue={profile?.questionsPreference ?? ''}
                        className={inputClass}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Yes, moderated">Yes, moderated</option>
                        <option value="Undecided">Undecided</option>
                        <option value="Other">Other</option>
                    </select>
                    <input
                        name="questionsPreferenceOther"
                        type="text"
                        defaultValue={profile?.questionsPreferenceOther ?? ''}
                        placeholder="If Other, tell us more"
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <styled.span display="block" className={fieldLabelClass} mb="2">
                        Presentation details
                    </styled.span>
                    <Flex direction="column" gap="1">
                        {PRESENTATION_DETAIL_OPTIONS.map((option) => (
                            <label key={option} className={checkboxRowClass}>
                                <input
                                    type="checkbox"
                                    name="presentationDetails"
                                    value={option}
                                    defaultChecked={profile?.presentationDetails.includes(option) ?? false}
                                />
                                {option}
                            </label>
                        ))}
                    </Flex>
                    <input
                        name="presentationDetailsOther"
                        type="text"
                        defaultValue={profile?.presentationDetailsOther ?? ''}
                        placeholder="If Other, tell us more"
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <label className={checkboxRowClass}>
                        <input
                            type="checkbox"
                            name="optOutOfRecording"
                            value="yes"
                            defaultChecked={profile?.optOutOfRecording ?? false}
                        />
                        Opt out of recording
                    </label>
                </Box>

                <Box mb="5">
                    <styled.span display="block" className={fieldLabelClass} mb="2">
                        Introduction
                    </styled.span>
                    <Flex direction="column" gap="1" mb="2">
                        <label className={checkboxRowClass}>
                            <input
                                type="radio"
                                name="introductionSource"
                                value="sessionize"
                                defaultChecked={profile?.introductionUseSessionizeBio ?? true}
                            />
                            Use my Sessionize bio
                        </label>
                        <label className={checkboxRowClass}>
                            <input
                                type="radio"
                                name="introductionSource"
                                value="custom"
                                defaultChecked={profile ? !profile.introductionUseSessionizeBio : false}
                            />
                            Write a custom introduction
                        </label>
                    </Flex>
                    <textarea
                        name="introductionCustomText"
                        rows={3}
                        defaultValue={profile?.introductionCustomText ?? ''}
                        placeholder="Only used if 'Write a custom introduction' is selected"
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <label htmlFor={`anythingElse-${sessionizeId}`} className={fieldLabelClass}>
                        Anything else we should know?
                    </label>
                    <textarea
                        id={`anythingElse-${sessionizeId}`}
                        name="anythingElse"
                        rows={3}
                        defaultValue={profile?.anythingElse ?? ''}
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <label htmlFor={`dietary-${sessionizeId}`} className={fieldLabelClass}>
                        Dietary requirements
                    </label>
                    <input
                        id={`dietary-${sessionizeId}`}
                        name="dietaryRequirements"
                        type="text"
                        defaultValue={profile?.dietaryRequirements ?? ''}
                        className={inputClass}
                    />
                </Box>

                <Box mb="5">
                    <label htmlFor={`dinner-${sessionizeId}`} className={fieldLabelClass}>
                        RSVP — Speakers dinner
                    </label>
                    <select
                        id={`dinner-${sessionizeId}`}
                        name="rsvpSpeakersDinner"
                        defaultValue={profile?.rsvpSpeakersDinner ?? ''}
                        className={inputClass}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Maybe">Maybe</option>
                    </select>
                </Box>

                <Box mb="5">
                    <styled.span display="block" className={fieldLabelClass} mb="2">
                        RSVP — Speaker training
                    </styled.span>
                    <Flex direction="column" gap="1">
                        {SPEAKER_TRAINING_SESSION_OPTIONS.map((option) => (
                            <label key={option} className={checkboxRowClass}>
                                <input
                                    type="checkbox"
                                    name="rsvpSpeakerTraining"
                                    value={option}
                                    defaultChecked={profile?.rsvpSpeakerTraining.includes(option) ?? false}
                                />
                                {option}
                            </label>
                        ))}
                    </Flex>
                </Box>

                <Box mb="6">
                    <label htmlFor={`meetExperts-${sessionizeId}`} className={fieldLabelClass}>
                        Register for Meet the Experts
                    </label>
                    <select
                        id={`meetExperts-${sessionizeId}`}
                        name="registerMeetTheExperts"
                        defaultValue={profile?.registerMeetTheExperts ?? ''}
                        className={inputClass}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Maybe">Maybe</option>
                        <option value="Other">Other</option>
                    </select>
                    <input
                        name="registerMeetTheExpertsOther"
                        type="text"
                        defaultValue={profile?.registerMeetTheExpertsOther ?? ''}
                        placeholder="If Other, tell us more"
                        className={inputClass}
                    />
                </Box>

                <Flex justify="flex-end">
                    <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</PrimaryButton>
                </Flex>
            </styled.form>
        </AdminCard>
    )
}
