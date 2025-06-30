import { DateTime } from 'luxon'
import { Link } from 'react-router'
import { Box, Flex, styled } from '~/styled-system/jsx'

interface AdminOverlayProps {
    user: { login: string; avatarUrl: string }
    overrideDate?: string | null
    currentDate: string
    timezone: string
}

export function AdminOverlay({ user, overrideDate, currentDate, timezone }: AdminOverlayProps) {
    const overrideDateTime = overrideDate ? DateTime.fromISO(overrideDate) : null
    const currentDateTime = DateTime.fromISO(currentDate)

    return (
        <Box
            position="sticky"
            top="0"
            left="0"
            right="0"
            zIndex="50"
            bg="rgba(0, 0, 0, 0.9)"
            color="white"
            py="2"
            px="4"
            fontSize="sm"
            borderBottom="2px solid"
            borderColor={overrideDateTime ? 'orange.500' : 'gray.700'}
        >
            <Flex maxW="7xl" mx="auto" alignItems="center" justifyContent="space-between">
                <Flex alignItems="center" gap="4">
                    <Flex alignItems="center" gap="2">
                        <styled.img src={user.avatarUrl} alt={user.login} w="6" h="6" borderRadius="full" />
                        <styled.span fontWeight="medium">Admin: {user.login}</styled.span>
                    </Flex>

                    {overrideDateTime ? (
                        <Box px="3" py="1" bg="orange.600" borderRadius="md" fontWeight="medium">
                            Date Override Active:{' '}
                            {overrideDateTime.toLocaleString(DateTime.DATETIME_SHORT, {
                                locale: 'en-AU',
                            })}
                        </Box>
                    ) : (
                        <Box px="3" py="1" bg="gray.700" borderRadius="md">
                            System Time:{' '}
                            {currentDateTime.toLocaleString(DateTime.DATETIME_SHORT, {
                                locale: 'en-AU',
                            })}
                        </Box>
                    )}

                    <styled.span color="gray.400" fontSize="xs">
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
