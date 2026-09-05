import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * Countdown to the conference day, top of the speaker dashboard. Days-left
 * math mirrors `getDaysLeft` in components/page-components/important-dates.tsx.
 */
export function SpeakerCountdown({
    conferenceName,
    conferenceDateLabel,
    daysUntil,
}: {
    conferenceName: string
    conferenceDateLabel: string
    daysUntil: number
}) {
    const message =
        daysUntil > 1
            ? `${daysUntil} days until ${conferenceName}`
            : daysUntil === 1
              ? `1 day until ${conferenceName}`
              : daysUntil === 0
                ? `${conferenceName} is today!`
                : `${conferenceName} has wrapped up`

    return (
        <Box maxW="4xl" mx="auto" mb="6">
            <Flex
                align="center"
                justify="space-between"
                gap="3"
                flexWrap="wrap"
                p="4"
                borderRadius="lg"
                bg="admin.900"
                color="white"
            >
                <styled.span fontSize="lg" fontWeight="semibold">
                    {message}
                </styled.span>
                <styled.span fontSize="sm" color="admin.300">
                    {conferenceDateLabel}
                </styled.span>
            </Flex>
        </Box>
    )
}
