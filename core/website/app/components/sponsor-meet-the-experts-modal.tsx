import { useState } from 'react'
import { Form, useNavigation } from 'react-router'
import { SpeakerModal } from '~/components/speaker-modal'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { MeetTheExpertsSlotView } from './speaker-meet-the-experts-modal'

const checkboxRowClass = css({
    display: 'flex',
    alignItems: 'flex-start',
    gap: '3',
    fontSize: 'sm',
    color: 'admin.800',
    p: '3',
    borderRadius: 'md',
    bg: 'admin.100',
})

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
 * "Register for Meet the Experts" modal for the sponsor portal — same
 * structure as `SpeakerMeetTheExpertsModal` (checkbox list of configured
 * slots + a bio toggle), submitting to `save-meet-the-experts` on
 * `/portal`. One registration per sponsor (company-level), unlike speakers
 * there's no preliminary opt-in question — a sponsor goes straight to
 * registering. The bio default is the sponsor's own submitted company blurb
 * rather than a Sessionize bio.
 */
export function SponsorMeetTheExpertsModal({
    open,
    onOpenChange,
    issueKey,
    slots,
    selectedSlotIds,
    hasResponded,
    justResponded,
    blurb,
    bioUseDefault,
    bioCustomText,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    issueKey: string
    slots: MeetTheExpertsSlotView[]
    selectedSlotIds: string[]
    hasResponded: boolean
    justResponded: boolean
    /** The sponsor's submitted company blurb — prefills the read-only "use
     * our company blurb" view. */
    blurb?: string
    bioUseDefault: boolean
    bioCustomText?: string
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('_action') === 'save-meet-the-experts'

    const [editingBio, setEditingBio] = useState(!bioUseDefault)

    return (
        <SpeakerModal title="Meet the Experts" open={open} onOpenChange={onOpenChange}>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Select every time slot your team can make — it's fine to leave them all unchecked if none of them
                work for you.
            </styled.p>

            {justResponded && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    Saved — thank you!
                </Box>
            )}

            {slots.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600">
                    No Meet the Experts time slots have been announced yet.
                </styled.p>
            ) : (
                <Form method="post">
                    <input type="hidden" name="_action" value="save-meet-the-experts" />
                    <input type="hidden" name="targetIssueKey" value={issueKey} />
                    <Flex direction="column" gap="2" mb="5">
                        {slots.map((slot) => (
                            <label key={slot.id} htmlFor={`meetExpertsSlot-${slot.id}`} className={checkboxRowClass}>
                                <input
                                    id={`meetExpertsSlot-${slot.id}`}
                                    type="checkbox"
                                    name="registerMeetTheExpertsSlots"
                                    value={slot.id}
                                    defaultChecked={selectedSlotIds.includes(slot.id)}
                                />
                                <styled.span>{slot.label}</styled.span>
                            </label>
                        ))}
                    </Flex>

                    <Box mb="5">
                        <styled.span display="block" className={fieldLabelClass} mb="2">
                            Bio/description
                        </styled.span>
                        <input
                            type="hidden"
                            name="meetTheExpertsBioSource"
                            value={editingBio ? 'custom' : 'default'}
                        />
                        {editingBio ? (
                            <textarea
                                name="meetTheExpertsBioCustomText"
                                rows={4}
                                defaultValue={bioCustomText ?? blurb ?? ''}
                                placeholder="What should attendees know about your team for a Meet the Experts chat?"
                                className={inputClass}
                            />
                        ) : (
                            <>
                                <textarea readOnly rows={4} value={blurb ?? ''} className={readOnlyTextareaClass} />
                                <Flex align="center" justify="space-between" mt="2" gap="3">
                                    <styled.p fontSize="xs" color="admin.600">
                                        Just use our company blurb.
                                    </styled.p>
                                    <styled.button
                                        type="button"
                                        onClick={() => setEditingBio(true)}
                                        fontSize="xs"
                                        fontWeight="medium"
                                        color="admin.900"
                                        textDecoration="underline"
                                        bg="transparent"
                                        border="none"
                                        cursor="pointer"
                                        flexShrink="0"
                                    >
                                        Edit bio
                                    </styled.button>
                                </Flex>
                            </>
                        )}
                    </Box>

                    <Flex justify="flex-end">
                        <styled.button
                            type="submit"
                            disabled={isSubmitting}
                            bg="admin.900"
                            color="white"
                            border="none"
                            py="2.5"
                            px="6"
                            borderRadius="md"
                            fontSize="sm"
                            fontWeight="semibold"
                            cursor="pointer"
                            _hover={{ bg: 'admin.800' }}
                            _disabled={{ bg: 'admin.400', cursor: 'not-allowed', opacity: 0.8 }}
                        >
                            {isSubmitting ? 'Saving…' : hasResponded ? 'Update' : 'Save'}
                        </styled.button>
                    </Flex>
                </Form>
            )}
        </SpeakerModal>
    )
}
