import { useNavigation } from 'react-router'
import { useState, type ReactNode } from 'react'
import { PRESENTATION_DETAIL_OPTIONS, type SpeakerProfile } from '~/lib/services/speakers-store'
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

const readOnlyTextareaClass = css({
    mt: '1',
    w: 'full',
    px: '3',
    py: '2',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.300',
    borderRadius: 'md',
    fontSize: 'sm',
    bg: 'admin.100',
    color: 'admin.700',
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

const MEET_THE_EXPERTS_OPT_IN = new Set(['Yes', 'Maybe', 'Other'])

/**
 * Session/speaker-details form for one presenter (self or a co-presenter —
 * either can fill this in for the other; see requireSpeaker/getCoPresenterIds).
 * Lives inside the "Fill in session details" modal — one copy per presenter
 * on the session, with co-presenters other than the active one collapsed by
 * the caller. Submits to the current route's action with `_action=save-profile`
 * and a hidden `targetSessionizeId`. Doesn't cover the training/dinner RSVPs
 * — those are their own modals.
 */
export function SpeakerProfileForm({
    sessionizeId,
    fullName,
    bio,
    profile,
    justSaved,
    meetTheExpertsSlots,
}: {
    sessionizeId: string
    fullName: string
    bio?: string
    profile: SpeakerProfile | null
    justSaved: boolean
    meetTheExpertsSlots: Array<{ id: string; label: string }>
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('targetSessionizeId') === sessionizeId

    const [questionsPreference, setQuestionsPreference] = useState(profile?.questionsPreference ?? '')
    const [presentationDetails, setPresentationDetails] = useState(
        new Set(profile?.presentationDetails ?? []),
    )
    const [editingIntroduction, setEditingIntroduction] = useState(
        profile ? !profile.introductionUseSessionizeBio : false,
    )
    const [registerMeetTheExperts, setRegisterMeetTheExperts] = useState(profile?.registerMeetTheExperts ?? '')

    return (
        <Box>
            <styled.h3 fontSize="lg" fontWeight="semibold" mb="2">
                {fullName}'s info
            </styled.h3>
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
                        value={questionsPreference}
                        onChange={(e) => setQuestionsPreference(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Yes, moderated">Yes, moderated</option>
                        <option value="Undecided">Undecided</option>
                        <option value="Other">Other</option>
                    </select>
                    {questionsPreference === 'Other' && (
                        <input
                            name="questionsPreferenceOther"
                            type="text"
                            defaultValue={profile?.questionsPreferenceOther ?? ''}
                            placeholder="Tell us more"
                            className={inputClass}
                        />
                    )}
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
                                    checked={presentationDetails.has(option)}
                                    onChange={(e) =>
                                        setPresentationDetails((prev) => {
                                            const next = new Set(prev)
                                            if (e.target.checked) next.add(option)
                                            else next.delete(option)
                                            return next
                                        })
                                    }
                                />
                                {option}
                            </label>
                        ))}
                    </Flex>
                    {presentationDetails.has('Other') && (
                        <input
                            name="presentationDetailsOther"
                            type="text"
                            defaultValue={profile?.presentationDetailsOther ?? ''}
                            placeholder="Tell us more"
                            className={inputClass}
                        />
                    )}
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
                    <input
                        type="hidden"
                        name="introductionSource"
                        value={editingIntroduction ? 'custom' : 'sessionize'}
                    />
                    {editingIntroduction ? (
                        <textarea
                            name="introductionCustomText"
                            rows={4}
                            defaultValue={profile?.introductionCustomText ?? bio ?? ''}
                            placeholder="How should we introduce you on stage?"
                            className={inputClass}
                        />
                    ) : (
                        <>
                            <textarea readOnly rows={4} value={bio ?? ''} className={readOnlyTextareaClass} />
                            <Flex align="center" justify="space-between" mt="2" gap="3">
                                <styled.p fontSize="xs" color="admin.600">
                                    Just use the Sessionize bio.
                                </styled.p>
                                <styled.button
                                    type="button"
                                    onClick={() => setEditingIntroduction(true)}
                                    fontSize="xs"
                                    fontWeight="medium"
                                    color="admin.900"
                                    textDecoration="underline"
                                    bg="transparent"
                                    border="none"
                                    cursor="pointer"
                                    flexShrink="0"
                                >
                                    Edit introduction
                                </styled.button>
                            </Flex>
                        </>
                    )}
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

                <Box mb="6">
                    <label htmlFor={`meetExperts-${sessionizeId}`} className={fieldLabelClass}>
                        Register for Meet the Experts
                    </label>
                    <select
                        id={`meetExperts-${sessionizeId}`}
                        name="registerMeetTheExperts"
                        value={registerMeetTheExperts}
                        onChange={(e) => setRegisterMeetTheExperts(e.target.value)}
                        className={inputClass}
                    >
                        <option value="">— Select —</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                        <option value="Maybe">Maybe</option>
                        <option value="Other">Other</option>
                    </select>
                    {registerMeetTheExperts === 'Other' && (
                        <input
                            name="registerMeetTheExpertsOther"
                            type="text"
                            defaultValue={profile?.registerMeetTheExpertsOther ?? ''}
                            placeholder="Tell us more"
                            className={inputClass}
                        />
                    )}
                    {MEET_THE_EXPERTS_OPT_IN.has(registerMeetTheExperts) && meetTheExpertsSlots.length > 0 && (
                        <Box mt="3">
                            <styled.span display="block" className={fieldLabelClass} mb="2">
                                Which time slots work for you?
                            </styled.span>
                            <Flex direction="column" gap="1">
                                {meetTheExpertsSlots.map((slot) => (
                                    <label key={slot.id} className={checkboxRowClass}>
                                        <input
                                            type="checkbox"
                                            name="registerMeetTheExpertsSlots"
                                            value={slot.id}
                                            defaultChecked={profile?.registerMeetTheExpertsSlots.includes(slot.id) ?? false}
                                        />
                                        {slot.label}
                                    </label>
                                ))}
                            </Flex>
                        </Box>
                    )}
                </Box>

                <Flex justify="flex-end">
                    <PrimaryButton disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save'}</PrimaryButton>
                </Flex>
            </styled.form>
        </Box>
    )
}
