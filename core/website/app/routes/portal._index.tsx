import { useState } from 'react'
import { conferenceManifest } from '@conference/manifest'
import { data, useActionData, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AppLink } from '~/components/app-link'
import { SponsorMeetTheExpertsModal } from '~/components/sponsor-meet-the-experts-modal'
import { requireSponsorContact } from '~/lib/auth.server'
import { parseMeetTheExpertsForm } from '~/lib/speakers/profile-form.server'
import { isProfileComplete, profileChecklist } from '~/lib/sponsors/profile'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const [profile, contacts, meetTheExpertsRegistration] = await Promise.all([
        services.sponsors.getProfile(sponsor.issueKey),
        services.sponsors.getContactEmails(sponsor.issueKey),
        services.meetTheExperts.getRegistration('sponsor', sponsor.issueKey),
    ])

    return {
        issueKey: sponsor.issueKey,
        checklist: profileChecklist(profile),
        complete: isProfileComplete(profile),
        completedAt: profile?.completedAt ?? null,
        contacts,
        meetTheExpertsSlots: conferenceManifest.meetTheExperts?.slots ?? [],
        meetTheExpertsResponded: Boolean(meetTheExpertsRegistration),
        meetTheExpertsSelectedSlotIds: meetTheExpertsRegistration?.slots ?? [],
        meetTheExpertsBioUseDefault: meetTheExpertsRegistration?.bioUseDefault ?? true,
        meetTheExpertsBioCustomText: meetTheExpertsRegistration?.bioCustomText,
        blurb: profile?.blurb,
    }
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const actionType = formData.get('_action')

    if (actionType === 'save-meet-the-experts') {
        const targetIssueKey = formData.get('targetIssueKey')
        if (targetIssueKey !== sponsor.issueKey) throw new Response('Not Found', { status: 404 })
        const { slots, bioUseSessionizeBio, bioCustomText } = parseMeetTheExpertsForm(formData)
        await services.meetTheExperts.saveRegistration(
            'sponsor',
            sponsor.issueKey,
            { slots, bioUseDefault: bioUseSessionizeBio, bioCustomText },
            user.email,
        )
        return data({ meetTheExpertsSaved: true })
    }

    return data({ error: 'Unknown action' }, { status: 400 })
}

export default function PortalDashboard() {
    const {
        issueKey,
        checklist,
        complete,
        contacts,
        meetTheExpertsSlots,
        meetTheExpertsResponded,
        meetTheExpertsSelectedSlotIds,
        meetTheExpertsBioUseDefault,
        meetTheExpertsBioCustomText,
        blurb,
    } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [meetTheExpertsOpen, setMeetTheExpertsOpen] = useState(false)
    const meetTheExpertsJustResponded = Boolean(actionData && 'meetTheExpertsSaved' in actionData)

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

            {meetTheExpertsSlots.length > 0 && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Meet the Experts
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Put someone from your team forward to chat with attendees during a Meet the Experts time
                        slot.
                    </styled.p>
                    <Flex align="center" justify="space-between" gap="4" flexWrap="wrap">
                        <styled.span fontSize="sm" color="admin.900">
                            {meetTheExpertsResponded
                                ? meetTheExpertsSelectedSlotIds.length > 0
                                    ? `Registered for ${meetTheExpertsSelectedSlotIds.length} time slot${meetTheExpertsSelectedSlotIds.length === 1 ? '' : 's'}.`
                                    : "Registered — you've said none of the slots work."
                                : 'Not yet registered.'}
                        </styled.span>
                        <styled.button
                            type="button"
                            onClick={() => setMeetTheExpertsOpen(true)}
                            bg="admin.900"
                            color="white"
                            border="none"
                            py="2"
                            px="4"
                            borderRadius="md"
                            fontSize="sm"
                            fontWeight="semibold"
                            cursor="pointer"
                            _hover={{ bg: 'admin.800' }}
                        >
                            {meetTheExpertsResponded ? 'Update' : 'Register'}
                        </styled.button>
                    </Flex>
                </AdminCard>
            )}

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

            <SponsorMeetTheExpertsModal
                open={meetTheExpertsOpen}
                onOpenChange={setMeetTheExpertsOpen}
                issueKey={issueKey}
                slots={meetTheExpertsSlots}
                selectedSlotIds={meetTheExpertsSelectedSlotIds}
                hasResponded={meetTheExpertsResponded}
                justResponded={meetTheExpertsJustResponded}
                blurb={blurb}
                bioUseDefault={meetTheExpertsBioUseDefault}
                bioCustomText={meetTheExpertsBioCustomText}
            />
        </Box>
    )
}
