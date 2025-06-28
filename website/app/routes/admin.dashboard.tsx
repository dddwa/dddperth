import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { Box, Grid, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.dashboard'

export async function loader({ request }: Route.LoaderArgs) {
    await requireAdmin(request)
}

export default function AdminDashboard() {
    return (
        <Box p="8" maxW="7xl" mx="auto">
            <styled.h1 fontSize="3xl" fontWeight="bold" mb="8" color="white">
                Dashboard
            </styled.h1>

            <Grid columns={{ base: 1, md: 2 }} gap="6" mb="8">
                <Box bg="white" p="6" borderRadius="lg" boxShadow="sm" border="1px solid" borderColor="gray.200">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4" color="gray.900">
                        Voting Progress
                    </styled.h2>
                    <styled.p color="gray.600" mb="4">
                        Monitor the current status of talk voting and submission progress.
                    </styled.p>
                    <AppLink
                        to="/admin/voting"
                        display="inline-block"
                        bg="accent.7"
                        color="white"
                        py="2"
                        px="4"
                        borderRadius="md"
                        textDecoration="none"
                        fontSize="sm"
                        fontWeight="medium"
                        _hover={{ bg: 'accent.8' }}
                    >
                        View Voting Progress
                    </AppLink>
                </Box>

                <Box
                    bg="white"
                    p="6"
                    borderRadius="lg"
                    boxShadow="sm"
                    border="1px solid"
                    borderColor="gray.200"
                    opacity="0.6"
                >
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="4" color="gray.900">
                        Content Management
                    </styled.h2>
                    <styled.p color="gray.600" mb="4">
                        Manage website content, blog posts, and announcements.
                    </styled.p>
                    <styled.span
                        display="inline-block"
                        bg="gray.300"
                        color="gray.600"
                        py="2"
                        px="4"
                        borderRadius="md"
                        fontSize="sm"
                        fontWeight="medium"
                    >
                        Coming Soon
                    </styled.span>
                </Box>
            </Grid>
        </Box>
    )
}
