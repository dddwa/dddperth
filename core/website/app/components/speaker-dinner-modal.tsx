import { Form, useNavigation } from 'react-router'
import { SpeakerModal } from '~/components/speaker-modal'
import type { YesNoMaybe } from '~/lib/services/speakers-store'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

const radioRowClass = css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'sm',
    color: 'admin.800',
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

const fieldLabelClass = css({
    display: 'block',
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.700',
})

/**
 * "RSVP for the speaker dinner" modal — Yes/No/Maybe plus dietary
 * requirements (only relevant if they're attending), submits to
 * `rsvp-dinner`. Shows an "add to calendar" link once answered Yes or Maybe.
 */
export function SpeakerDinnerModal({
    open,
    onOpenChange,
    sessionizeId,
    dateLabel,
    calendarUrl,
    currentResponse,
    currentDietaryRequirements,
    justResponded,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    sessionizeId: string
    dateLabel: string
    calendarUrl?: string
    currentResponse?: YesNoMaybe
    currentDietaryRequirements?: string
    justResponded: boolean
}) {
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting' && navigation.formData?.get('_action') === 'rsvp-dinner'

    return (
        <SpeakerModal title="RSVP for the speaker dinner" open={open} onOpenChange={onOpenChange}>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                {dateLabel}
            </styled.p>

            {justResponded && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    RSVP saved — thank you!
                </Box>
            )}

            <Form method="post">
                <input type="hidden" name="_action" value="rsvp-dinner" />
                <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
                <Flex direction="column" gap="2" mb="5">
                    {(['Yes', 'No', 'Maybe'] as const).map((option) => (
                        <label key={option} className={radioRowClass}>
                            <input
                                type="radio"
                                name="rsvpSpeakersDinner"
                                value={option}
                                defaultChecked={currentResponse === option}
                            />
                            {option}
                        </label>
                    ))}
                </Flex>

                <Box mb="5">
                    <label htmlFor={`dietary-${sessionizeId}`} className={fieldLabelClass}>
                        Dietary requirements
                    </label>
                    <input
                        id={`dietary-${sessionizeId}`}
                        name="dietaryRequirements"
                        type="text"
                        defaultValue={currentDietaryRequirements ?? ''}
                        className={inputClass}
                    />
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
                        {isSubmitting ? 'Saving…' : 'RSVP'}
                    </styled.button>
                </Flex>
            </Form>

            {(currentResponse === 'Yes' || currentResponse === 'Maybe') && calendarUrl && (
                <Box mt="6" pt="5" borderTop="[1px solid token(colors.border.subtle)]">
                    <styled.a
                        href={calendarUrl}
                        download="Speaker Dinner.ics"
                        fontSize="sm"
                        color="admin.900"
                        textDecoration="underline"
                    >
                        Add to your calendar 🗓️
                    </styled.a>
                </Box>
            )}
        </SpeakerModal>
    )
}
