import type { ReactNode } from 'react'
import { AppLink } from '~/components/app-link'
import { SponsorLogo } from '~/components/sponsor-logo'
import { TalkRecording } from '~/components/talk-recording'
import * as Dialog from '~/components/ui/dialog'
import type { YearSponsors } from '~/lib/conference-state-client-safe'
import { Box, type BoxProps, Flex, styled } from '~/styled-system/jsx'

export interface TalkDialogSession {
    id: string
    title: string
    description: string | null
    room: string | null
    speakers: { id: string; name: string }[]
}

export interface TalkDialogSpeaker {
    id: string
    fullName: string
    tagLine: string | null
    bio: string | null
    profilePicture: string | null
    links: { title: string; url: string }[]
}

type RoomSponsor = NonNullable<YearSponsors['room']>[number]

function CloseIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
        >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
    )
}

/**
 * A talk's abstract and its speakers' bios, opened over the agenda.
 *
 * Full screen on small viewports, a centred card from `md` up.
 *
 * The agenda already holds everything but the speaker profiles, so it opens
 * the dialog the moment a talk is clicked and `speakers` arrives once the talk
 * route's loader resolves. `undefined` means still loading.
 *
 * Not portalled: on a direct load of a talk URL the server renders the dialog
 * open, and a portal only mounts in the browser, so the talk would be missing
 * from the HTML that crawlers and link previews see.
 */
export function TalkDialog({
    session,
    timeRange,
    roomSponsor,
    speakers,
    recordingVideoId,
    feedback,
    onClose,
}: {
    /** Null when closed. */
    session: TalkDialogSession | null
    timeRange: string | null
    roomSponsor: RoomSponsor | undefined
    speakers: TalkDialogSpeaker[] | undefined
    /** YouTube video id of the talk's recording, when there is one. */
    recordingVideoId?: string
    /** The "give feedback" link, while the conference's feedback window is open. */
    feedback?: ReactNode
    onClose: () => void
}) {
    return (
        <Dialog.Root
            // Through Ark rather than as an `id` prop on Content: Ark finds the
            // content element by this id, and overriding it there breaks focus
            // trapping and Escape. The e2e visual suite scopes to it.
            ids={{ content: 'talk-detail-content' }}
            open={session !== null}
            onOpenChange={(e) => !e.open && onClose()}
            lazyMount
            unmountOnExit
        >
            <Dialog.Backdrop
                bgColor="overlay.scrim"
                position="fixed"
                inset="0"
                zIndex="overlay"
                backdropFilter="auto"
                backdropBlur="xs"
            />
            <Dialog.Positioner
                position="fixed"
                inset="0"
                display="flex"
                alignItems="center"
                justifyContent="center"
                p={{ base: '0', md: '4' }}
                zIndex="modal"
            >
                <Dialog.Content
                    bgColor="surface.elevated"
                    color="text.primary"
                    boxShadow="lg"
                    width="full"
                    height={{ base: 'dvh', md: 'auto' }}
                    maxWidth={{ base: 'full', md: '3xl' }}
                    maxHeight={{ base: 'dvh', md: 'dialog-max-h' }}
                    borderRadius={{ base: 'none', md: 'xl' }}
                    display="flex"
                    flexDirection="column"
                    fontSize="sm"
                >
                    {session ? (
                        <>
                            <Flex
                                alignItems="flex-start"
                                justifyContent="space-between"
                                gap="4"
                                px={{ base: '4', md: '6' }}
                                py="4"
                                borderBottom="subtle"
                                flexShrink="0"
                            >
                                <Dialog.Title fontSize="lg" fontWeight="semibold" lineHeight="tight">
                                    {session.title}
                                </Dialog.Title>
                                <Dialog.CloseTrigger
                                    aria-label="Close"
                                    display="inline-flex"
                                    alignItems="center"
                                    justifyContent="center"
                                    flexShrink="0"
                                    w="10"
                                    h="10"
                                    color="text.secondary"
                                    bgColor="transparent"
                                    border="none"
                                    cursor="pointer"
                                    borderRadius="md"
                                    _hover={{ bgColor: 'overlay.subtle', color: 'text.primary' }}
                                    _focusVisible={{
                                        outline: '[3px solid token(colors.interactive.focus)]',
                                        outlineOffset: '0.5',
                                    }}
                                >
                                    <CloseIcon />
                                </Dialog.CloseTrigger>
                            </Flex>
                            <Box px={{ base: '4', md: '6' }} py="5" overflowY="auto">
                                <Flex flexWrap="wrap" columnGap="4" rowGap="1" color="text.secondary" mb="3">
                                    {timeRange ? <span>🕓 {timeRange}</span> : null}
                                    {session.room ? <span>📍 {session.room}</span> : null}
                                </Flex>
                                {roomSponsor ? <RoomSponsorBadge sponsor={roomSponsor} /> : null}
                                {feedback ? <Box mb="3">{feedback}</Box> : null}
                                {recordingVideoId ? (
                                    <TalkRecording videoId={recordingVideoId} talkTitle={session.title} />
                                ) : null}
                                {session.description ? (
                                    <Dialog.Description whiteSpace="pre-line" lineHeight="relaxed">
                                        {session.description}
                                    </Dialog.Description>
                                ) : null}
                                {session.speakers.length ? (
                                    <styled.section mt="6" aria-labelledby="talk-speakers-heading">
                                        <styled.h3
                                            id="talk-speakers-heading"
                                            fontSize="md"
                                            fontWeight="semibold"
                                            mb="3"
                                        >
                                            {session.speakers.length > 1 ? 'Speakers' : 'Speaker'}
                                        </styled.h3>
                                        <styled.ul listStyle="none" display="grid" gap="6" aria-busy={!speakers}>
                                            {session.speakers.map((s) => (
                                                <SpeakerProfile
                                                    key={s.id}
                                                    name={s.name}
                                                    profile={speakers?.find((p) => p.id === s.id)}
                                                    loading={!speakers}
                                                />
                                            ))}
                                        </styled.ul>
                                    </styled.section>
                                ) : null}
                            </Box>
                        </>
                    ) : null}
                </Dialog.Content>
            </Dialog.Positioner>
        </Dialog.Root>
    )
}

function SpeakerProfile({
    name,
    profile,
    loading,
}: {
    name: string
    profile: TalkDialogSpeaker | undefined
    loading: boolean
}) {
    return (
        <styled.li display="flex" gap="4" alignItems="flex-start">
            {profile?.profilePicture ? (
                <styled.img
                    src={profile.profilePicture}
                    alt=""
                    width="16"
                    height="16"
                    borderRadius="full"
                    objectFit="cover"
                    flexShrink="0"
                />
            ) : loading ? (
                <Box width="16" height="16" borderRadius="full" bgColor="surface.card" flexShrink="0" />
            ) : null}
            <Box minWidth="0" flex="1">
                <styled.h4 fontSize="md" fontWeight="semibold">
                    {profile?.fullName ?? name}
                </styled.h4>
                {profile?.tagLine ? <styled.p color="text.secondary">{profile.tagLine}</styled.p> : null}
                {loading ? (
                    <Box mt="2" display="grid" gap="2" aria-hidden="true">
                        <SkeletonLine width="full" />
                        <SkeletonLine width="5/6" />
                        <SkeletonLine width="3/5" />
                    </Box>
                ) : profile?.bio ? (
                    <styled.p mt="2" whiteSpace="pre-line" lineHeight="relaxed">
                        {profile.bio}
                    </styled.p>
                ) : null}
                {profile?.links.length ? (
                    <styled.ul listStyle="none" display="flex" flexWrap="wrap" gap="3" mt="2">
                        {profile.links.map((link) => (
                            <li key={link.url}>
                                <AppLink unstyled to={link.url} color="text.highlight" textDecoration="underline">
                                    {link.title}
                                </AppLink>
                            </li>
                        ))}
                    </styled.ul>
                ) : null}
            </Box>
        </styled.li>
    )
}

function SkeletonLine({ width }: { width: BoxProps['width'] }) {
    return <Box height="3" width={width} borderRadius="sm" bgColor="surface.card" />
}

function RoomSponsorBadge({ sponsor }: { sponsor: RoomSponsor }) {
    return (
        <Flex alignItems="center" gap="2" color="text.secondary" mb="4">
            <span>Room sponsored by</span>
            <AppLink unstyled to={sponsor.website} display="inline-flex" alignItems="center">
                <SponsorLogo
                    logoUrlDarkMode={sponsor.logoUrlDarkMode}
                    logoUrlLightMode={sponsor.logoUrlLightMode}
                    name={sponsor.name}
                    maxHeight="10"
                    maxWidth="36"
                    objectFit="contain"
                />
            </AppLink>
        </Flex>
    )
}
