import { Portal } from '@ark-ui/react/portal'
import type { ReactNode } from 'react'
import * as Dialog from '~/components/ui/dialog'
import { Flex, styled } from '~/styled-system/jsx'

function CloseIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
    )
}

/**
 * Generic centered modal shell — the checklist's "Fill in session details",
 * "RSVP for speaker training" and "RSVP for speaker dinner" actions all open
 * one of these rather than jumping to inline page content.
 */
export function SpeakerModal({
    title,
    open,
    onOpenChange,
    children,
}: {
    title: string
    open: boolean
    onOpenChange: (open: boolean) => void
    children: ReactNode
}) {
    return (
        <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <Portal>
                <Dialog.Backdrop
                    bgColor="overlay.scrim"
                    position="fixed"
                    inset="0"
                    height="[100vh]"
                    width="[100vw]"
                    zIndex="overlay"
                    backdropFilter="[blur(4px)]"
                />
                <Dialog.Positioner
                    position="fixed"
                    inset="0"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    p="4"
                    zIndex="modal"
                >
                    <Dialog.Content
                        bgColor="white"
                        color="admin.900"
                        borderRadius="xl"
                        boxShadow="lg"
                        width="full"
                        maxWidth="[560px]"
                        maxHeight="[85vh]"
                        display="flex"
                        flexDirection="column"
                    >
                        <Flex
                            alignItems="center"
                            justifyContent="space-between"
                            px="6"
                            py="4"
                            borderBottom="[1px solid token(colors.border.subtle)]"
                            flexShrink="0"
                        >
                            <Dialog.Title fontSize="lg" fontWeight="semibold">
                                {title}
                            </Dialog.Title>
                            <Dialog.CloseTrigger
                                aria-label="Close"
                                display="inline-flex"
                                alignItems="center"
                                justifyContent="center"
                                w="8"
                                h="8"
                                color="admin.700"
                                bgColor="transparent"
                                border="none"
                                cursor="pointer"
                                borderRadius="md"
                                _hover={{ bgColor: 'admin.100' }}
                            >
                                <CloseIcon />
                            </Dialog.CloseTrigger>
                        </Flex>
                        <styled.div px="6" py="5" overflowY="auto">
                            {children}
                        </styled.div>
                    </Dialog.Content>
                </Dialog.Positioner>
            </Portal>
        </Dialog.Root>
    )
}
