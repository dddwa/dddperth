import { useState } from 'react'
import { PRESENTATION_DETAIL_OPTIONS, type SessionDetailsInput } from '~/lib/services/speakers-store'
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

/**
 * Session-level fields, shared by every presenter on a session — audience
 * questions, presentation format, recording opt-out, "anything else". Filled
 * in once per session rather than once per presenter, at the top of the
 * "Fill in your session details" modal. Field names are suffixed with
 * `sessionizeSessionId` since the whole modal submits as one form with a
 * single "Save" button (see `SpeakerSessionDetailsModal`); any presenter on
 * the session may submit it on the group's behalf, same authorization idiom
 * as `SpeakerProfileForm`. Parsed back out by `parseSessionDetailsForm`.
 */
export function SessionDetailsForm({
    sessionizeSessionId,
    title,
    details,
}: {
    sessionizeSessionId: string
    title: string
    details: SessionDetailsInput | null
}) {
    const [questionsPreference, setQuestionsPreference] = useState(details?.questionsPreference ?? '')
    const [presentationDetails, setPresentationDetails] = useState(new Set(details?.presentationDetails ?? []))

    return (
        <Box>
            <styled.h3 fontSize="lg" fontWeight="semibold" mb="2">
                {title}
            </styled.h3>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                These apply to the session as a whole — if you have a co-presenter, only one of you needs to fill
                this in.
            </styled.p>

            <Box mb="5">
                <label htmlFor={`questions-${sessionizeSessionId}`} className={fieldLabelClass}>
                    Will you take audience questions?
                </label>
                <select
                    id={`questions-${sessionizeSessionId}`}
                    name={`questionsPreference-${sessionizeSessionId}`}
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
                        name={`questionsPreferenceOther-${sessionizeSessionId}`}
                        type="text"
                        defaultValue={details?.questionsPreferenceOther ?? ''}
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
                                name={`presentationDetails-${sessionizeSessionId}`}
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
                        name={`presentationDetailsOther-${sessionizeSessionId}`}
                        type="text"
                        defaultValue={details?.presentationDetailsOther ?? ''}
                        placeholder="Tell us more"
                        className={inputClass}
                    />
                )}
            </Box>

            <Box mb="5">
                <styled.span
                    id={`optOutOfRecording-label-${sessionizeSessionId}`}
                    display="block"
                    className={fieldLabelClass}
                    mb="1"
                >
                    Recording
                </styled.span>
                <styled.p id={`optOutOfRecording-desc-${sessionizeSessionId}`} fontSize="xs" color="admin.600" mb="2">
                    If you opt out, we will not record this session at all.
                </styled.p>
                <label className={checkboxRowClass}>
                    <input
                        type="checkbox"
                        name={`optOutOfRecording-${sessionizeSessionId}`}
                        value="yes"
                        defaultChecked={details?.optOutOfRecording ?? false}
                        aria-labelledby={`optOutOfRecording-label-${sessionizeSessionId}`}
                        aria-describedby={`optOutOfRecording-desc-${sessionizeSessionId}`}
                    />
                    Opt out of having this session recorded and published
                </label>
            </Box>

            <Box>
                <label htmlFor={`anythingElse-${sessionizeSessionId}`} className={fieldLabelClass}>
                    Anything else we should know?
                </label>
                <textarea
                    id={`anythingElse-${sessionizeSessionId}`}
                    name={`anythingElse-${sessionizeSessionId}`}
                    rows={3}
                    defaultValue={details?.anythingElse ?? ''}
                    className={inputClass}
                />
            </Box>
        </Box>
    )
}
