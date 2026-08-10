import { Form, useNavigation } from 'react-router'
import type { SpeakerSessionDetailsSection } from '~/lib/speakers/workspace-view.server'
import { SessionDetailsForm } from '~/components/session-details-form'
import { SpeakerModal } from '~/components/speaker-modal'
import { SpeakerProfileForm } from '~/components/speaker-profile-form'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

const sessionSectionClass = css({
    borderTop: '[1px solid token(colors.border.subtle)]',
    _first: { borderTop: 'none' },
    pt: '6',
    mt: '6',
    _firstOfType: { mt: '0', pt: '0' },
})

const presenterDetailsClass = css({
    borderTop: '[1px solid token(colors.border.subtle)]',
    _first: { borderTop: 'none' },
    pt: '4',
    mt: '4',
    _firstOfType: { mt: '0', pt: '0' },
})

const summaryClass = css({
    cursor: 'pointer',
    fontSize: 'md',
    fontWeight: 'semibold',
    color: 'admin.900',
    listStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    _marker: { display: 'none' },
    '&::-webkit-details-marker': { display: 'none' },
})

/**
 * "Fill in session details" modal — one section per session the speaker
 * presents on: the shared session-level fields once (`SessionDetailsForm`),
 * then one collapsible per-presenter fields block each (`SpeakerProfileForm`),
 * open by default for `activeSessionizeId` (the logged-in speaker on their
 * own dashboard, or the previewed speaker on the admin page) and collapsed
 * for any co-presenters. Everything submits together as one form with a
 * single "Save" button at the end, rather than a separate button per
 * section — see `parseSessionDetailsForm`/`parseSpeakerProfileForm`, which
 * pull each section's fields back out by their `sessionize*Id` suffix.
 */
export function SpeakerSessionDetailsModal({
    open,
    onOpenChange,
    activeSessionizeId,
    sessions,
    justSaved,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeSessionizeId: string
    sessions: SpeakerSessionDetailsSection[]
    justSaved: boolean
}) {
    const navigation = useNavigation()
    const isSubmitting =
        navigation.state === 'submitting' && navigation.formData?.get('_action') === 'save-session-details-modal'

    const presenterIds = [...new Set(sessions.flatMap((s) => s.presenters.map((p) => p.sessionizeId)))]

    return (
        <SpeakerModal title="Session details" open={open} onOpenChange={onOpenChange}>
            {justSaved && (
                <Box role="status" mb="4" p="3" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                    Saved — thank you!
                </Box>
            )}

            {sessions.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600">
                    No sessions found yet — check back after the next sync.
                </styled.p>
            ) : (
                <Form method="post">
                    <input type="hidden" name="_action" value="save-session-details-modal" />
                    {sessions.map((session) => (
                        <input key={session.sessionizeSessionId} type="hidden" name="sessionIds" value={session.sessionizeSessionId} />
                    ))}
                    {presenterIds.map((id) => (
                        <input key={id} type="hidden" name="presenterIds" value={id} />
                    ))}

                    {sessions.map((session) => (
                        <Box key={session.sessionizeSessionId} className={sessionSectionClass}>
                            <SessionDetailsForm
                                sessionizeSessionId={session.sessionizeSessionId}
                                title={session.title}
                                details={session.sessionDetails}
                            />

                            {session.presenters.map((presenter) => (
                                <styled.details
                                    key={presenter.sessionizeId}
                                    open={presenter.sessionizeId === activeSessionizeId}
                                    className={presenterDetailsClass}
                                >
                                    <styled.summary className={summaryClass}>{presenter.fullName}</styled.summary>
                                    <Box mt="3">
                                        <SpeakerProfileForm
                                            sessionizeId={presenter.sessionizeId}
                                            fullName={presenter.fullName}
                                            bio={presenter.bio}
                                            profile={presenter.profile}
                                        />
                                    </Box>
                                </styled.details>
                            ))}
                        </Box>
                    ))}

                    <Flex justify="flex-end" mt="6" pt="6" borderTop="[1px solid token(colors.border.subtle)]">
                        <styled.button
                            type="submit"
                            disabled={isSubmitting}
                            bg="admin.900"
                            color="white"
                            border="none"
                            py="2.5"
                            px="6"
                            borderRadius="md"
                            fontSize="sm"
                            fontWeight="semibold"
                            cursor="pointer"
                            transition="colors"
                            _hover={{ bg: 'admin.800' }}
                            _disabled={{ bg: 'admin.400', cursor: 'not-allowed', opacity: 0.8 }}
                        >
                            {isSubmitting ? 'Saving…' : 'Save'}
                        </styled.button>
                    </Flex>
                </Form>
            )}
        </SpeakerModal>
    )
}
