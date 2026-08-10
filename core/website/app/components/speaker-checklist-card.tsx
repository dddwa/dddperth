import { DateTime } from 'luxon'
import type { SpeakerChecklistItem } from '~/lib/speakers/checklist'
import { AdminCard } from '~/components/admin-card'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

const actionLinkClass = css({
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.900',
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
})

const claimButtonClass = css({
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.900',
    bg: 'white',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'admin.400',
    borderRadius: 'md',
    py: '1',
    px: '3',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    _hover: { bg: 'admin.100' },
})

function dueDateLabel(dueDateIso?: string): string | null {
    if (!dueDateIso) return null
    return `Due ${DateTime.fromISO(dueDateIso).toLocaleString(DateTime.DATE_MED, { locale: 'en-AU' })}`
}

/** The link/action for one outstanding item — varies by what it takes to
 * complete it. Renders nothing once the item is done. */
function ChecklistAction({
    item,
    sessionizeId,
    ticketClaimUrl,
    hasOwnProfileForm,
}: {
    item: SpeakerChecklistItem
    sessionizeId: string
    ticketClaimUrl?: string
    hasOwnProfileForm: boolean
}) {
    if (item.done) return null

    if (item.key === 'confirmSession') {
        return (
            <Flex align="center" gap="3" wrap="wrap">
                <styled.a href="https://sessionize.com/app/speaker" target="_blank" rel="noreferrer" className={actionLinkClass}>
                    Open Sessionize ↗
                </styled.a>
                <styled.form method="post">
                    <input type="hidden" name="_action" value="confirm-session" />
                    <button type="submit" className={claimButtonClass}>
                        I've already confirmed it
                    </button>
                </styled.form>
            </Flex>
        )
    }

    if (item.key === 'sessionDetails' || item.key === 'speakerTraining') {
        const anchor = item.key === 'sessionDetails' ? 'session-details' : 'speaker-training'
        return hasOwnProfileForm ? (
            <styled.a href={`#${anchor}-${sessionizeId}`} className={actionLinkClass}>
                {item.key === 'sessionDetails' ? 'Fill in now' : 'RSVP now'}
            </styled.a>
        ) : (
            <styled.span fontSize="xs" color="admin.600">
                No sessions yet
            </styled.span>
        )
    }

    // claimTicket
    return (
        <Flex align="center" gap="3" wrap="wrap">
            {ticketClaimUrl ? (
                <styled.a href={ticketClaimUrl} target="_blank" rel="noreferrer" className={actionLinkClass}>
                    Claim your ticket ↗
                </styled.a>
            ) : (
                <styled.span fontSize="xs" color="admin.600">
                    Contact the organisers to claim your ticket
                </styled.span>
            )}
            <styled.form method="post">
                <input type="hidden" name="_action" value="claim-ticket" />
                <button type="submit" className={claimButtonClass}>
                    I've claimed it
                </button>
            </styled.form>
        </Flex>
    )
}

/**
 * Outstanding-items checklist at the top of the speaker dashboard: session
 * details, ticket claim, training RSVP — each with a due date and a way to
 * action it. Completed items stay visible, ticked off, so a speaker can see
 * everything they've already sorted.
 */
export function SpeakerChecklistCard({
    sessionizeId,
    checklist,
    ticketClaimUrl,
    hasOwnProfileForm,
}: {
    sessionizeId: string
    checklist: SpeakerChecklistItem[]
    ticketClaimUrl?: string
    hasOwnProfileForm: boolean
}) {
    const allDone = checklist.every((item) => item.done)

    return (
        <Box maxW="4xl" mx="auto">
            <AdminCard>
                <styled.h2 fontSize="xl" fontWeight="semibold" mb="2">
                    Your checklist
                </styled.h2>
                <styled.p fontSize="sm" color="admin.600" mb="6">
                    A few things we need from you before the conference.
                </styled.p>

                {allDone && (
                    <Box mb="6" p="4" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
                        All done — thank you! 🎉
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
                            flexWrap="wrap"
                        >
                            <styled.span fontSize="lg" aria-hidden>
                                {item.done ? '✅' : '⬜️'}
                            </styled.span>
                            <Box flex="1" minW="0">
                                <styled.span display="block" fontSize="sm" fontWeight="medium" color="admin.900">
                                    {item.label}
                                </styled.span>
                                {dueDateLabel(item.dueDateIso) && (
                                    <styled.span display="block" fontSize="xs" color="admin.600">
                                        {dueDateLabel(item.dueDateIso)}
                                    </styled.span>
                                )}
                            </Box>
                            <ChecklistAction
                                item={item}
                                sessionizeId={sessionizeId}
                                ticketClaimUrl={ticketClaimUrl}
                                hasOwnProfileForm={hasOwnProfileForm}
                            />
                        </Flex>
                    ))}
                </Flex>
            </AdminCard>
        </Box>
    )
}
