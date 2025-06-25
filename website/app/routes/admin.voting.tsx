import { AppLink } from '~/components/app-link'
import { Box, Flex, styled } from '~/styled-system/jsx'

export default function AdminVoting() {
    return (
        <Box p="8" maxW="7xl" mx="auto">
            <styled.h1 fontSize="3xl" fontWeight="bold" mb="8" color="white">
                Voting
            </styled.h1>

            <Box
                bg="white"
                p="12"
                borderRadius="lg"
                boxShadow="sm"
                border="1px solid"
                borderColor="gray.200"
                textAlign="center"
            >
                <styled.div fontSize="6xl" mb="6">
                    🚧
                </styled.div>

                <styled.h2 fontSize="2xl" fontWeight="semibold" mb="4" color="gray.900">
                    Voting Coming Soon
                </styled.h2>

                <Flex justify="center" gap="4" flexWrap="wrap">
                    <AppLink
                        to="/admin/dashboard"
                        display="inline-block"
                        bg="accent.7"
                        color="white"
                        py="3"
                        px="6"
                        borderRadius="md"
                        textDecoration="none"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{ bg: 'accent.8' }}
                    >
                        ← Back to Dashboard
                    </AppLink>
                </Flex>
            </Box>
        </Box>
    )
}
