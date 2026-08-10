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

export interface TrainingSessionView {
    id: string
    title: string
    dateLabel: string
    calendarUrl: string
}

/**
 * "RSVP for speaker training" modal — checkboxes for each configured
 * session, submits to `rsvp-training`. Once responded, shows an "add to
 * calendar" link per selected session (ics data URLs are pre-built
 * server-side in the loader — see lib/speakers/calendar.server.ts).
 */
export function SpeakerTrainingModal({
    open,
    onOpenChange,
    sessionizeId,
    sessions,
    selectedSessionIds,
    hasResponded,
    justResponded,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    sessionizeId: string
    sessions: TrainingSessionView[]
    selectedSessionIds: string[]
    hasResponded: boolean
    justResponded: boolean
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('_action') === 'rsvp-training'

    return (
        <SpeakerModal title="RSVP for speaker training" open={open} onOpenChange={onOpenChange}>
            <styled.p fontSize="sm" color="admin.600" mb="4">
                Select every session you can make — it's fine to leave them all unchecked if you can't attend any.
            </styled.p>

            {justResponded && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    RSVP saved — thank you!
                </Box>
            )}

            {sessions.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600">
                    No training sessions have been announced yet.
                </styled.p>
            ) : (
                <Form method="post">
                    <input type="hidden" name="_action" value="rsvp-training" />
                    <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
                    <Flex direction="column" gap="2" mb="5">
                        {sessions.map((session) => (
                            <label
                                key={session.id}
                                htmlFor={`training-${session.id}`}
                                aria-label={`${session.title}, ${session.dateLabel}`}
                                className={checkboxRowClass}
                            >
                                <input
                                    id={`training-${session.id}`}
                                    type="checkbox"
                                    name="rsvpSpeakerTraining"
                                    value={session.id}
                                    defaultChecked={selectedSessionIds.includes(session.id)}
                                />
                                <Box>
                                    <styled.span display="block" fontWeight="medium" color="admin.900">
                                        {session.title}
                                    </styled.span>
                                    <styled.span display="block" fontSize="xs" color="admin.600">
                                        {session.dateLabel}
                                    </styled.span>
                                </Box>
                            </label>
                        ))}
                    </Flex>
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
            )}

            {hasResponded && selectedSessionIds.length > 0 && (
                <Box mt="6" pt="5" borderTop="[1px solid token(colors.border.subtle)]">
                    <styled.h4 fontSize="sm" fontWeight="semibold" color="admin.900" mb="2">
                        Add to your calendar
                    </styled.h4>
                    <Flex direction="column" gap="1">
                        {sessions
                            .filter((session) => selectedSessionIds.includes(session.id))
                            .map((session) => (
                                <styled.a
                                    key={session.id}
                                    href={session.calendarUrl}
                                    download={`${session.title}.ics`}
                                    fontSize="sm"
                                    color="admin.900"
                                    textDecoration="underline"
                                >
                                    {session.title} 🗓️
                                </styled.a>
                            ))}
                    </Flex>
                </Box>
            )}
        </SpeakerModal>
    )
}
