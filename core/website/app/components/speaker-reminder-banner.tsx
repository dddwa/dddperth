import { Box, Flex, styled } from '~/styled-system/jsx'

export interface ReminderEvent {
    label: string
    dateLabel: string
}

/**
 * "Coming up" notice shown above the checklist when the speaker has RSVP'd
 * to something (a training session, the dinner) happening within the next
 * 7 days. Renders nothing when there's nothing upcoming.
 */
export function SpeakerReminderBanner({ events }: { events: ReminderEvent[] }) {
    if (events.length === 0) return null

    return (
        <Box maxW="4xl" mx="auto" mb="6">
            <Box p="4" borderRadius="lg" bg="status.info.bg" color="status.info.fg">
                <styled.p fontSize="sm" fontWeight="semibold" mb="2">
                    Coming up
                </styled.p>
                <Flex direction="column" gap="1">
                    {events.map((event) => (
                        <styled.p key={event.label} fontSize="sm">
                            {event.label} — {event.dateLabel}
                        </styled.p>
                    ))}
                </Flex>
            </Box>
        </Box>
    )
}
