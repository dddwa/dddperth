import { Popover } from '@ark-ui/react/popover'
import type { ReactNode } from 'react'
import { styled } from '~/styled-system/jsx'

const Trigger = styled(Popover.Trigger)
const Content = styled(Popover.Content)

/**
 * An (i) button that shows a short note when pressed.
 *
 * A popover rather than a hover tooltip: a tooltip never opens on a touch
 * screen, and sponsors read the portal on phones. Press, Enter or Space opens
 * it; Escape, a second press or a click elsewhere closes it.
 */
export function InfoToggletip({ label, children }: { label: string; children: ReactNode }) {
    return (
        <Popover.Root positioning={{ placement: 'top' }}>
            <Trigger
                type="button"
                aria-label={label}
                display="inline-flex"
                alignItems="center"
                justifyContent="center"
                // 24px: the WCAG 2.2 minimum target size.
                w="6"
                h="6"
                ml="1"
                verticalAlign="middle"
                borderRadius="full"
                border="[1px solid currentColor]"
                bg="transparent"
                color="admin.700"
                fontSize="xs"
                fontWeight="bold"
                fontStyle="italic"
                cursor="pointer"
                _hover={{ bg: 'admin.100', color: 'admin.900' }}
                _focusVisible={{ outline: 'none', boxShadow: 'focus-ring' }}
            >
                i
            </Trigger>
            <Popover.Positioner>
                <Content
                    maxW="xs"
                    p="3"
                    bg="admin.900"
                    color="white"
                    borderRadius="md"
                    boxShadow="lg"
                    fontSize="sm"
                    fontWeight="normal"
                    lineHeight="normal"
                    zIndex="popover"
                    _focusVisible={{ outline: 'none', boxShadow: 'focus-ring' }}
                >
                    {children}
                </Content>
            </Popover.Positioner>
        </Popover.Root>
    )
}
