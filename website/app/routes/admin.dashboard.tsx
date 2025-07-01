import { AdminCard } from '~/components/admin-card'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { Grid, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.dashboard'

export async function loader({ request }: Route.LoaderArgs) {
    await requireAdmin(request)
}

export default function AdminDashboard() {
    return (
        <AdminLayout heading="Dashboard">
            <Grid columns={{ base: 1, md: 2 }} gap="6" mb="8">
                <AdminCard>
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
                </AdminCard>
                <AdminCard opacity="0.6">
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
                </AdminCard>
            </Grid>
        </AdminLayout>
    )
}
