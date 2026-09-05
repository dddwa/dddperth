import { AdminCard } from '~/components/admin-card'
import type { SpeakerWorkspaceSessionView } from '~/lib/speakers/workspace-view.server'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { AppLink } from './app-link'

/**
 * Renders a speaker's sessions/co-presenters/links — the dashboard content
 * shown both at `/speaker-portal` (the speaker's own view) and
 * `/admin/speakers/$sessionizeId` (an admin's read-only preview of the same
 * thing). Keeping this as one component means the two can never drift.
 */
export function SpeakerWorkspaceView({
    sessionizeId,
    sessions,
    infoPackUrl,
    isAdminView,
}: {
    sessionizeId: string
    sessions: SpeakerWorkspaceSessionView[]
    infoPackUrl?: string
    /** True when rendered as the admin's read-only preview — skips the
     * reassurance copy explaining why a slot isn't showing, since admins
     * already know accepted sessions always have one. */
    isAdminView?: boolean
}) {
    return (
        <Box maxW="4xl" mx="auto">
            {infoPackUrl && (
                <AdminCard>
                    <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                        Speaker info pack
                    </styled.h2>
                    <AppLink unstyled to={infoPackUrl} target="_blank" rel="noreferrer" textDecoration="underline" fontSize="sm">
                        Download the speaker info pack
                    </AppLink>
                </AdminCard>
            )}

            {sessions.length === 0 && (
                <AdminCard>
                    <styled.p fontSize="sm" color="admin.600">
                        No sessions found yet. If you were expecting to see one here, check back after the next sync
                        or contact the organisers.
                    </styled.p>
                </AdminCard>
            )}

            {sessions.map((session) => (
                <AdminCard key={session.sessionizeSessionId}>
                    <Flex justify="space-between" align="flex-start" flexWrap="wrap" gap="2" mb="2">
                        <styled.h2 fontSize="xl" fontWeight="semibold">
                            {session.title}
                        </styled.h2>
                        <styled.span
                            fontSize="xs"
                            fontWeight="medium"
                            textTransform="uppercase"
                            letterSpacing="wide"
                            py="0.5"
                            px="2"
                            borderRadius="md"
                            bg={session.status === 'Waitlisted' ? 'status.warning.bg' : 'status.success.bg'}
                            color={session.status === 'Waitlisted' ? 'status.warning.fg' : 'status.success.fg'}
                        >
                            {session.status}
                        </styled.span>
                    </Flex>

                    <Flex wrap="wrap" gap="2" mb="4">
                        {session.format && <MetaBadge>{session.format}</MetaBadge>}
                        {session.level && <MetaBadge>{session.level}</MetaBadge>}
                        {session.generalTopic && <MetaBadge>{session.generalTopic}</MetaBadge>}
                        {session.talkTopics.map((topic) => (
                            <MetaBadge key={topic} variant="topic">
                                {topic}
                            </MetaBadge>
                        ))}
                    </Flex>

                    {session.description && (
                        <styled.p fontSize="sm" color="admin.700" mb="6" whiteSpace="pre-wrap">
                            {session.description}
                        </styled.p>
                    )}

                    <styled.h3 fontSize="sm" fontWeight="semibold" color="admin.600" mb="3" textTransform="uppercase" letterSpacing="wide">
                        {session.presenters.length > 1 ? 'Speakers' : 'Speaker'}
                    </styled.h3>
                    <Flex direction="column" gap="4">
                        {session.presenters.map((presenter) => (
                            <Flex key={presenter.sessionizeId} gap="4" align="flex-start">
                                {presenter.profilePictureUrl && (
                                    <styled.img
                                        src={presenter.profilePictureUrl}
                                        alt={presenter.fullName}
                                        w="12"
                                        h="12"
                                        borderRadius="full"
                                        objectFit="cover"
                                    />
                                )}
                                <Box>
                                    <styled.p fontSize="sm" fontWeight="medium" color="admin.900">
                                        {presenter.fullName}
                                        {presenter.sessionizeId === sessionizeId && (
                                            <styled.span ml="2" fontSize="xs" color="admin.600">
                                                (you)
                                            </styled.span>
                                        )}
                                    </styled.p>
                                    {presenter.tagLine && (
                                        <styled.p fontSize="xs" color="admin.600">
                                            {presenter.tagLine}
                                        </styled.p>
                                    )}
                                    {presenter.bio && (
                                        <styled.p fontSize="sm" color="admin.700" mt="1">
                                            {presenter.bio}
                                        </styled.p>
                                    )}
                                    {(presenter.twitterUrl || presenter.linkedInUrl || presenter.otherLinks.length > 0) && (
                                        <Flex gap="3" mt="2" wrap="wrap">
                                            {presenter.twitterUrl && (
                                                <AppLink unstyled
                                                    to={presenter.twitterUrl}
                                                    fontSize="xs"
                                                    color="admin.700"
                                                    textDecoration="underline"
                                                >
                                                    Twitter/X
                                                </AppLink>
                                            )}
                                            {presenter.linkedInUrl && (
                                                <AppLink unstyled
                                                    to={presenter.linkedInUrl}
                                                    fontSize="xs"
                                                    color="admin.700"
                                                    textDecoration="underline"
                                                >
                                                    LinkedIn
                                                </AppLink>
                                            )}
                                            {presenter.otherLinks.map((link) => (
                                                <AppLink unstyled
                                                    key={link.url}
                                                    to={link.url}
                                                    fontSize="xs"
                                                    color="admin.700"
                                                    textDecoration="underline"
                                                >
                                                    {link.title}
                                                </AppLink>
                                            ))}
                                        </Flex>
                                    )}
                                </Box>
                            </Flex>
                        ))}
                    </Flex>
                </AdminCard>
            ))}
        </Box>
    )
}

function MetaBadge({ children, variant = 'default' }: { children: string; variant?: 'default' | 'topic' }) {
    return (
        <styled.span
            fontSize="xs"
            fontWeight="medium"
            py="0.5"
            px="2"
            borderRadius="md"
            bg={variant === 'topic' ? 'admin.100' : 'status.info.bg'}
            color={variant === 'topic' ? 'admin.700' : 'status.info.fg'}
        >
            {children}
        </styled.span>
    )
}
