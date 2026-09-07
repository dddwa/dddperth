import { AppLink } from '~/components/app-link'
import { Box, Flex, styled } from '~/styled-system/jsx'

/**
 * The confirmation shown after a portal save, with a link onward to whatever
 * the sponsor still owes us.
 *
 * Vicki's report: saving left sponsors on the form they'd just submitted with
 * no route onward except the nav bar, so they assumed they were finished. The
 * banner names the next outstanding section, or says they're done.
 */
export function PortalSavedBanner({
    message,
    next,
}: {
    message: string
    /** The next incomplete section, or null when everything required is done. */
    next: { label: string; href: string } | null
}) {
    return (
        <Box
            role="status"
            mb="4"
            p="4"
            bg="status.success.bg"
            borderRadius="md"
            fontSize="sm"
            color="status.success.fg"
        >
            <Flex align="center" justify="space-between" gap="4" flexWrap="wrap">
                <Box>
                    <styled.p fontWeight="medium">{message}</styled.p>
                    <styled.p mt="1">
                        {next
                            ? `Next up: ${next.label}. You can come back and change this any time.`
                            : "That's everything we need — thank you! You can update your details any time before the conference."}
                    </styled.p>
                </Box>
                <AppLink
                    to={next?.href ?? '/portal'}
                    unstyled
                    flexShrink="0"
                    display="inline-block"
                    bg="admin.900"
                    color="white"
                    py="2"
                    px="4"
                    borderRadius="md"
                    fontSize="sm"
                    fontWeight="semibold"
                    textDecoration="none"
                    _hover={{ bg: 'admin.800' }}
                >
                    {next ? `Continue to ${next.label}` : 'Back to dashboard'}
                </AppLink>
            </Flex>
        </Box>
    )
}
