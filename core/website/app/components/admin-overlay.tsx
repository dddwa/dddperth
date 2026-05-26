import { DateTime } from 'luxon'
import { Link } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { Box, Flex, styled } from '~/styled-system/jsx'

interface AdminOverlayProps {
    user: { email: string; name: string | null }
    overrideDate?: string | null
    currentDate: string
    timezone: string
}

export function AdminOverlay({ user, overrideDate, currentDate, timezone }: AdminOverlayProps) {
    const overrideDateTime = overrideDate
        ? DateTime.fromISO(overrideDate, { zone: conferenceManifest.public.timezone })
        : null
    const currentDateTime = DateTime.fromISO(currentDate, { zone: conferenceManifest.public.timezone })

    return (
        <Box
            position="sticky"
            top="0"
            left="0"
            right="0"
            color="white"
            py="2"
            px="4"
            fontSize="sm"
            style={{
                zIndex: 50,
                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                borderBottom: `2px solid ${overrideDateTime ? 'rgb(239, 68, 68)' : 'rgb(107, 114, 128)'}`,
            }}
        >
            <Flex maxW="7xl" mx="auto" alignItems="center" justifyContent="space-between">
                <Flex alignItems="center" gap="4">
                    <Flex alignItems="center" gap="2">
                        <styled.span fontWeight="medium">Admin: {user.name || user.email}</styled.span>
                    </Flex>

                    {overrideDateTime ? (
                        <Box px="3" py="1" bg="status.warning.bg" borderRadius="md" fontWeight="medium">
                            Date Override Active:{' '}
                            {overrideDateTime.toLocaleString(DateTime.DATETIME_SHORT, {
                                locale: 'en-AU',
                            })}
                        </Box>
                    ) : (
                        <Box px="3" py="1" bg="gray.7" borderRadius="md">
                            System Time:{' '}
                            {currentDateTime.toLocaleString(DateTime.DATETIME_SHORT, {
                                locale: 'en-AU',
                            })}
                        </Box>
                    )}

                    <styled.span color="gray.4" fontSize="xs">
                        ({timezone})
                    </styled.span>
                </Flex>

                <Flex alignItems="center" gap="4">
                    <Link
                        to="/admin/settings"
                        style={{
                            color: 'white',
                            textDecoration: 'none',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            backgroundColor: 'rgba(75, 85, 99, 0.5)',
                            fontSize: '0.875rem',
                        }}
                    >
                        Settings
                    </Link>
                    <Link
                        to="/admin"
                        style={{
                            color: 'white',
                            textDecoration: 'none',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            backgroundColor: 'rgba(75, 85, 99, 0.5)',
                            fontSize: '0.875rem',
                        }}
                    >
                        Admin Home
                    </Link>
                </Flex>
            </Flex>
        </Box>
    )
}
