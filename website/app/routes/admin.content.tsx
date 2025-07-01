import { AppLink } from '~/components/app-link'
import { requireAdmin } from '~/lib/auth.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { AdminLayout } from '~/components/admin-layout'
import { AdminCard } from '~/components/admin-card'
import type { Route } from './+types/admin.content'

export async function loader({ request }: Route.LoaderArgs) {
    await requireAdmin(request)
}

export default function AdminContent() {
    return (
        <AdminLayout heading="Content Management">
            <AdminCard textAlign="center" p="12">

                <styled.div fontSize="6xl" mb="6">
                    🚧
                </styled.div>

                <styled.h2 fontSize="2xl" fontWeight="semibold" mb="4" color="gray.900">
                    Content Management Coming Soon
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
            </AdminCard>
        </AdminLayout>
    )
}
