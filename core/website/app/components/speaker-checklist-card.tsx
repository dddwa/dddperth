import { DateTime } from 'luxon'
import type { ChecklistUrgency, SpeakerChecklistItem } from '~/lib/speakers/checklist'
import { AdminCard } from '~/components/admin-card'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'

const actionLinkClass = css({
    fontSize: 'sm',
    fontWeight: 'medium',
    color: 'admin.900',
    textDecoration: 'underline',
    whiteSpace: 'nowrap',
    bg: 'transparent',
    border: 'none',
    cursor: 'pointer',
    p: '0',
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

const URGENCY_ROW_BG = {
    normal: 'admin.100',
    upcoming: 'status.warning.bg',
    overdue: 'status.danger.bg',
} as const satisfies Record<ChecklistUrgency, string>

const URGENCY_DATE_COLOR = {
    normal: 'admin.600',
    upcoming: 'status.warning.fg',
    overdue: 'status.danger.fg',
} as const satisfies Record<ChecklistUrgency, string>

function dueDateLabel(dueDateIso?: string): string | null {
    if (!dueDateIso) return null
    return `Due ${DateTime.fromISO(dueDateIso).toLocaleString(DateTime.DATE_MED, { locale: 'en-AU' })}`
}

export type ChecklistModalKey = 'sessionDetails' | 'speakerTraining' | 'speakerDinner'

/** The action for one outstanding item — a modal trigger for everything
 * except ticket claim, which keeps its external-link + self-report pattern.
 * Renders nothing once the item is done. */
function ChecklistAction({
    item,
    sessionizeId,
    ticketClaimUrl,
    onOpenModal,
}: {
    item: SpeakerChecklistItem
    sessionizeId: string
    ticketClaimUrl?: string
    onOpenModal: (key: ChecklistModalKey) => void
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
                    <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
                    <button type="submit" className={claimButtonClass}>
                        I've already confirmed it
                    </button>
                </styled.form>
            </Flex>
        )
    }

    if (item.key === 'sessionDetails' || item.key === 'speakerTraining' || item.key === 'speakerDinner') {
        const key = item.key
        const label = key === 'sessionDetails' ? 'Fill in now' : 'RSVP now'
        return (
            <button type="button" onClick={() => onOpenModal(key)} className={actionLinkClass}>
                {label}
            </button>
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
                <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
                <button type="submit" className={claimButtonClass}>
                    I've claimed it
                </button>
            </styled.form>
        </Flex>
    )
}

/**
 * Outstanding-items checklist at the top of the speaker dashboard: session
 * details, ticket claim, training RSVP, dinner RSVP — each with a due date
 * (coloured by urgency) and an action. Outstanding items are listed in full;
 * completed ones collapse into a condensed list at the bottom so a speaker
 * can still see everything they've already sorted.
 */
export function SpeakerChecklistCard({
    sessionizeId,
    checklist,
    ticketClaimUrl,
    onOpenModal,
}: {
    sessionizeId: string
    checklist: SpeakerChecklistItem[]
    ticketClaimUrl?: string
    onOpenModal: (key: ChecklistModalKey) => void
}) {
    const outstanding = checklist.filter((item) => !item.done)
    const completed = checklist.filter((item) => item.done)
    const allDone = outstanding.length === 0

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

                {outstanding.length > 0 && (
                    <Flex direction="column" gap="3" mb={completed.length > 0 ? '6' : '0'}>
                        {outstanding.map((item) => (
                            <Flex
                                key={item.key}
                                align="center"
                                gap="3"
                                p="3"
                                borderRadius="md"
                                bg={URGENCY_ROW_BG[item.urgency]}
                                flexWrap="wrap"
                            >
                                <styled.span fontSize="lg" aria-hidden>
                                    ⬜️
                                </styled.span>
                                <Box flex="1" minW="0">
                                    <styled.span display="block" fontSize="sm" fontWeight="medium" color="admin.900">
                                        {item.label}
                                    </styled.span>
                                    {dueDateLabel(item.dueDateIso) && (
                                        <styled.span
                                            display="block"
                                            fontSize="xs"
                                            fontWeight={item.urgency === 'normal' ? 'normal' : 'semibold'}
                                            color={URGENCY_DATE_COLOR[item.urgency]}
                                        >
                                            {dueDateLabel(item.dueDateIso)}
                                        </styled.span>
                                    )}
                                </Box>
                                <ChecklistAction
                                    item={item}
                                    sessionizeId={sessionizeId}
                                    ticketClaimUrl={ticketClaimUrl}
                                    onOpenModal={onOpenModal}
                                />
                            </Flex>
                        ))}
                    </Flex>
                )}

                {completed.length > 0 && (
                    <Flex direction="column" gap="1">
                        {completed.map((item) => (
                            <Flex key={item.key} align="center" gap="2" py="1.5" px="1">
                                <styled.span fontSize="sm" aria-hidden>
                                    ✅
                                </styled.span>
                                <styled.span fontSize="xs" color="admin.600" textDecoration="line-through">
                                    {item.label}
                                </styled.span>
                            </Flex>
                        ))}
                    </Flex>
                )}
            </AdminCard>
        </Box>
    )
}
