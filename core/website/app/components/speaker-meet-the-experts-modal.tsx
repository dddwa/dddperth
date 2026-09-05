import { useState } from 'react'
import { Form, useNavigation } from 'react-router'
import { SpeakerModal } from '~/components/speaker-modal'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

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

export interface MeetTheExpertsSlotView {
    id: string
    label: string
}

/**
 * "Register your Meet the Experts session times" modal — opened from its own
 * checklist item, which only appears once the speaker has opted in
 * (Yes/Maybe/Other) via the main session-details form. Checkboxes for each
 * configured time slot, submits to `save-meet-the-experts`. Same idiom as
 * `SpeakerTrainingModal`: an empty selection ("none work for me") is still a
 * valid, deliberate answer.
 *
 * Also includes its own bio/description — same "use my Sessionize bio as-is,
 * or write a custom one" pattern as the session-details modal's
 * introduction, since what a speaker wants attendees to know for a
 * Meet-the-Experts chat isn't always the same text as their on-stage intro.
 * The first time they unlock it for editing, the draft is seeded from
 * whatever custom intro they've already written in the session-details form
 * (`sessionDetailsIntroText`) rather than starting blank.
 */
export function SpeakerMeetTheExpertsModal({
    open,
    onOpenChange,
    sessionizeId,
    slots,
    selectedSlotIds,
    hasResponded,
    justResponded,
    bio,
    bioUseSessionizeBio,
    bioCustomText,
    sessionDetailsIntroText,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    sessionizeId: string
    slots: MeetTheExpertsSlotView[]
    selectedSlotIds: string[]
    hasResponded: boolean
    justResponded: boolean
    /** Sessionize bio — prefills the read-only "use my Sessionize bio" view. */
    bio?: string
    bioUseSessionizeBio: boolean
    bioCustomText?: string
    /** Their custom on-stage intro from the session-details form, if any —
     * seeds the textarea the first time they unlock editing. */
    sessionDetailsIntroText?: string
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('_action') === 'save-meet-the-experts'

    const [editingBio, setEditingBio] = useState(!bioUseSessionizeBio)

    return (
        <SpeakerModal title="Meet the Experts" open={open} onOpenChange={onOpenChange}>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Select every time slot you can make — it's fine to leave them all unchecked if none of them work for
                you.
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
                    <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
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
                            value={editingBio ? 'custom' : 'sessionize'}
                        />
                        {editingBio ? (
                            <textarea
                                name="meetTheExpertsBioCustomText"
                                rows={4}
                                defaultValue={bioCustomText ?? sessionDetailsIntroText ?? bio ?? ''}
                                placeholder="What should attendees know about you for a Meet the Experts chat?"
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
