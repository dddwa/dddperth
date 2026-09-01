import { useState } from 'react'
import type { SpeakerProfile } from '~/lib/services/speakers-store'
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

/**
 * Per-presenter fields for one presenter (self or a co-presenter — either
 * can fill this in for the other; see requireSpeaker/getCoPresenterIds).
 * Rendered once per presenter inside the "Fill in session details" modal,
 * below the shared `SessionDetailsForm` — field names are suffixed with
 * `sessionizeId` since the whole modal submits as one form with a single
 * "Save" button (see `SpeakerSessionDetailsModal`), so every presenter's
 * fields need distinct names. Parsed back out by `parseSpeakerProfileForm`.
 * Doesn't cover the session-level fields (see `SessionDetailsForm`) or the
 * training/dinner/meet-the-experts RSVPs — those are their own forms/modals.
 */
export function SpeakerProfileForm({
    sessionizeId,
    fullName,
    bio,
    profile,
}: {
    sessionizeId: string
    fullName: string
    bio?: string
    profile: SpeakerProfile | null
}) {
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

            <Box mb="5">
                <label htmlFor={`namePhonetic-${sessionizeId}`} className={fieldLabelClass}>
                    Name phonetic spelling
                </label>
                <input
                    id={`namePhonetic-${sessionizeId}`}
                    name={`namePhoneticSpelling-${sessionizeId}`}
                    type="text"
                    defaultValue={profile?.namePhoneticSpelling ?? ''}
                    placeholder="e.g. Ay-Mee Kay-per-nik"
                    className={inputClass}
                />
            </Box>

            <Box mb="5">
                <styled.span display="block" className={fieldLabelClass} mb="2">
                    Introduction
                </styled.span>
                <input
                    type="hidden"
                    name={`introductionSource-${sessionizeId}`}
                    value={editingIntroduction ? 'custom' : 'sessionize'}
                />
                {editingIntroduction ? (
                    <textarea
                        name={`introductionCustomText-${sessionizeId}`}
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

            <Box mb="6">
                <label htmlFor={`meetExperts-${sessionizeId}`} className={fieldLabelClass}>
                    Would you be interested in being a part of our Meet the Experts sessions?
                </label>
                <select
                    id={`meetExperts-${sessionizeId}`}
                    name={`registerMeetTheExperts-${sessionizeId}`}
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
                        name={`registerMeetTheExpertsOther-${sessionizeId}`}
                        type="text"
                        defaultValue={profile?.registerMeetTheExpertsOther ?? ''}
                        placeholder="Tell us more"
                        className={inputClass}
                    />
                )}
                {(registerMeetTheExperts === 'Yes' ||
                    registerMeetTheExperts === 'Maybe' ||
                    registerMeetTheExperts === 'Other') && (
                    <styled.p fontSize="xs" color="admin.600" mt="2">
                        We'll add a checklist item for you to choose your preferred session times.
                    </styled.p>
                )}
            </Box>
        </Box>
    )
}
