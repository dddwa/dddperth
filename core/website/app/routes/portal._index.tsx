import { useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AppLink } from '~/components/app-link'
import { requireSponsorContact } from '~/lib/auth.server'
import { isProfileComplete, profileChecklist } from '~/lib/sponsors/profile'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const [profile, contacts] = await Promise.all([
        services.sponsors.getProfile(sponsor.issueKey),
        services.sponsors.getContactEmails(sponsor.issueKey),
    ])

    return {
        checklist: profileChecklist(profile),
        complete: isProfileComplete(profile),
        completedAt: profile?.completedAt ?? null,
        contacts,
    }
}

export default function PortalDashboard() {
    const { checklist, complete, contacts } = useLoaderData<typeof loader>()

    return (
        <Box maxW="4xl" mx="auto">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Your checklist
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="6">
                    These are the things we need from you to feature your company on the website and around the
                    conference.
                </styled.p>

                {complete ? (
                    <Box mb="6" p="4" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        <styled.p fontWeight="medium">All done — thank you! 🎉</styled.p>
                        <styled.p mt="1">
                            We've got everything we need. You can update your details any time before the conference.
                        </styled.p>
                    </Box>
                ) : (
                    <Box mb="6" p="4" bg="status.info.bg" borderRadius="md" fontSize="sm" color="status.info.fg">
                        Head to{' '}
                        <AppLink to="/portal/profile" color="status.info.fg" textDecoration="underline">
                            Company profile
                        </AppLink>{' '}
                        to finish the outstanding items.
                    </Box>
                )}

                <Flex direction="column" gap="3">
                    {checklist.map((item) => (
                        <Flex
                            key={item.key}
                            align="center"
                            gap="3"
                            p="3"
                            borderRadius="md"
                            bg={item.done ? 'status.success.bg' : 'admin.100'}
                        >
                            <styled.span fontSize="lg" aria-hidden>
                                {item.done ? '✅' : '⬜️'}
                            </styled.span>
                            <styled.span fontSize="sm" fontWeight="medium" color="admin.900">
                                {item.label}
                            </styled.span>
                            {!item.required && (
                                <styled.span fontSize="xs" color="admin.600">
                                    optional
                                </styled.span>
                            )}
                        </Flex>
                    ))}
                </Flex>
            </AdminCard>

            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Who can access this workspace
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="4">
                    Anyone below can sign in with their email and edit your company's details. To add or remove
                    people, contact the sponsorship team.
                </styled.p>
                <Flex direction="column" gap="2">
                    {contacts.map((email) => (
                        <styled.span key={email} fontSize="sm" color="admin.900">
                            {email}
                        </styled.span>
                    ))}
                </Flex>
            </AdminCard>
        </Box>
    )
}
