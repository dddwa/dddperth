import { useEffect, useState } from 'react'
import { conferenceManifest } from '@conference/manifest'
import { data, useActionData, useLoaderData } from 'react-router'
import { AdminCard } from '~/components/admin-card'
import { AppLink } from '~/components/app-link'
import { SponsorMeetTheExpertsModal } from '~/components/sponsor-meet-the-experts-modal'
import { SponsorProgressList } from '~/components/sponsor-progress-list'
import { requireSponsorContact } from '~/lib/auth.server'
import { parseMeetTheExpertsForm } from '~/lib/speakers/profile-form.server'
import { logisticsVisibility } from '~/lib/sponsors/logistics'
import { allRequiredComplete, nextIncompleteSection, splitJiraOptions, sponsorProgress } from '~/lib/sponsors/progress'
import { getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import type { Route } from './+types/portal._index'

/** Maps the sponsor's raw Jira tier through the manifest, so section
 * visibility keys off the stable category rather than the Jira option label. */
function mappedTier(rawTier: string): string | undefined {
    return conferenceManifest.sponsorPortal?.jira.tierMap?.[rawTier]
}

export async function loader({ request, context }: Route.LoaderArgs) {
    const { sponsor } = await requireSponsorContact(request, context)
    const services = getServices(context)

    const [profile, contacts, meetTheExpertsRegistration, deliverables] = await Promise.all([
        services.sponsors.getProfile(sponsor.issueKey),
        services.sponsors.getContactEmails(sponsor.issueKey),
        services.meetTheExperts.getRegistration('sponsor', sponsor.issueKey),
        services.sponsorSync.getSponsorDeliverables(sponsor.issueKey),
    ])

    const slots = conferenceManifest.meetTheExperts?.slots ?? []
    const sections = sponsorProgress({
        profile,
        visibility: logisticsVisibility(mappedTier(sponsor.tier)),
        meetTheExpertsResponded: Boolean(meetTheExpertsRegistration),
        meetTheExpertsOffered: slots.length > 0,
    })

    return {
        issueKey: sponsor.issueKey,
        sections,
        complete: allRequiredComplete(sections),
        nextSection: nextIncompleteSection(sections) ?? null,
        contacts,
        deliverables,
        meetTheExpertsSlots: slots,
        meetTheExpertsResponded: Boolean(meetTheExpertsRegistration),
        meetTheExpertsSelectedSlotIds: meetTheExpertsRegistration?.slots ?? [],
        meetTheExpertsSelectedSlotLabels: slots
            .filter((slot) => (meetTheExpertsRegistration?.slots ?? []).includes(slot.id))
            .map((slot) => slot.label),
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
        sections,
        complete,
        nextSection,
        contacts,
        deliverables,
        meetTheExpertsSlots,
        meetTheExpertsResponded,
        meetTheExpertsSelectedSlotIds,
        meetTheExpertsSelectedSlotLabels,
        meetTheExpertsBioUseDefault,
        meetTheExpertsBioCustomText,
        blurb,
    } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [meetTheExpertsOpen, setMeetTheExpertsOpen] = useState(false)
    const meetTheExpertsJustResponded = Boolean(actionData && 'meetTheExpertsSaved' in actionData)

    // Close the modal once the save comes back, so the sponsor lands on the
    // dashboard summary rather than being left staring at the form they just
    // submitted (Vicki: "would logically close on save?"). The confirmation
    // shows on the dashboard instead.
    useEffect(() => {
        if (meetTheExpertsJustResponded) setMeetTheExpertsOpen(false)
    }, [actionData, meetTheExpertsJustResponded])

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
                        <styled.p fontWeight="medium">Next up: {nextSection?.label}</styled.p>
                        <styled.p mt="1">
                            Head to{' '}
                            <AppLink
                                to={nextSection?.href ?? '/portal/profile'}
                                color="status.info.fg"
                                unstyled
                                textDecoration="underline"
                            >
                                {nextSection?.label}
                            </AppLink>{' '}
                            to finish the outstanding items. You can come back and change anything later.
                        </styled.p>
                    </Box>
                )}

                <SponsorProgressList sections={sections} />
            </AdminCard>

            {(deliverables.assetsRequired || deliverables.assetUploadUrl) && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Assets we need from you
                    </styled.h2>
                    {deliverables.assetsRequired ? (
                        <>
                            <styled.p fontSize="sm" color="admin.600" mb="3">
                                Based on your sponsorship level, these are the assets we'll need. Your website logo and
                                blurb go in{' '}
                                <AppLink to="/portal/profile" unstyled textDecoration="underline" color="admin.900">
                                    Company profile
                                </AppLink>
                                {deliverables.assetUploadUrl
                                    ? '; everything else goes in the upload folder below.'
                                    : '.'}
                            </styled.p>
                            <Flex direction="column" gap="2" mb="4">
                                {splitJiraOptions(deliverables.assetsRequired).map((asset) => (
                                    <Flex key={asset} align="center" gap="3" p="3" borderRadius="md" bg="admin.100">
                                        <styled.span fontSize="sm" color="admin.900">
                                            {asset}
                                        </styled.span>
                                    </Flex>
                                ))}
                            </Flex>
                        </>
                    ) : (
                        <styled.p fontSize="sm" color="admin.600" mb="4">
                            Upload your artwork, videos and any other files for the conference here.
                        </styled.p>
                    )}
                    {deliverables.assetUploadUrl && (
                        <AppLink
                            to={deliverables.assetUploadUrl}
                            unstyled
                            display="inline-block"
                            bg="admin.900"
                            color="white"
                            py="2"
                            px="4"
                            borderRadius="md"
                            fontSize="sm"
                            fontWeight="semibold"
                            textDecoration="none"
                            _hover={{ bg: 'admin.800' }}
                        >
                            Upload your assets
                        </AppLink>
                    )}
                </AdminCard>
            )}

            {/* Room sponsors only, and only once the committee has actually
                chosen — an unassigned value reads back as undefined, so this
                stays hidden rather than naming a room nobody decided on. */}
            {deliverables.exhibitorRoom && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Your room
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600">
                        Your sponsorship covers{' '}
                        <styled.strong fontWeight="semibold">{deliverables.exhibitorRoom}</styled.strong>. We'll have
                        your branding in the room on the day.
                    </styled.p>
                </AdminCard>
            )}

            {deliverables.ticketClaimUrl && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Your tickets
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        {deliverables.freeTicketCount
                            ? `Your sponsorship includes ${deliverables.freeTicketCount} complimentary ticket${
                                  deliverables.freeTicketCount === '1' ? '' : 's'
                              }. `
                            : 'Your sponsorship includes complimentary tickets. '}
                        Share the link below with each person attending — they fill in their own details, and the link
                        works once per ticket.
                    </styled.p>
                    <AppLink
                        to={deliverables.ticketClaimUrl}
                        unstyled
                        display="inline-block"
                        bg="admin.900"
                        color="white"
                        py="2"
                        px="4"
                        borderRadius="md"
                        fontSize="sm"
                        fontWeight="semibold"
                        textDecoration="none"
                        _hover={{ bg: 'admin.800' }}
                    >
                        Claim your tickets
                    </AppLink>
                </AdminCard>
            )}

            {meetTheExpertsSlots.length > 0 && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Meet the Experts
                    </styled.h2>
                    <styled.p fontSize="sm" color="admin.600" mb="4">
                        Put someone from your team forward to chat with attendees during a Meet the Experts time slot.
                    </styled.p>

                    {meetTheExpertsJustResponded && (
                        <Box
                            role="status"
                            mb="4"
                            p="3"
                            bg="status.success.bg"
                            borderRadius="md"
                            fontSize="sm"
                            color="status.success.fg"
                        >
                            Saved — thank you!
                        </Box>
                    )}

                    {/* Vicki asked to see the slots and names at a glance, so
                        the summary lists what was submitted rather than just
                        counting it. The bio is deliberately left out — it's
                        long, and it's visible in the modal. */}
                    {meetTheExpertsSelectedSlotLabels.length > 0 && (
                        <Flex direction="column" gap="2" mb="4">
                            {meetTheExpertsSelectedSlotLabels.map((label) => (
                                <Flex key={label} align="center" gap="3" p="3" borderRadius="md" bg="admin.100">
                                    <styled.span fontSize="sm" color="admin.900">
                                        {label}
                                    </styled.span>
                                </Flex>
                            ))}
                        </Flex>
                    )}

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
                    Anyone below can sign in with their email and edit your company's details. To add or remove people,
                    contact the sponsorship team.
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
