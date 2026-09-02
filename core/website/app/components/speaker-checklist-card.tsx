import { DateTime } from 'luxon'
import { Form } from 'react-router'
import type { ChecklistUrgency, SpeakerChecklistItem } from '~/lib/speakers/checklist'
import { SPEAKER_CHECKLIST_ITEMS, type ChecklistItemAction, type ChecklistModalKey } from '~/lib/speakers/checklist-items'
import { AdminCard } from '~/components/admin-card'
import { css } from '~/styled-system/css'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { AppLink } from './app-link'

export type { ChecklistModalKey } from '~/lib/speakers/checklist-items'

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

/** Which modal reopens a completed item for editing — only items whose
 * action is a modal trigger are editable this way (claiming a ticket or
 * confirming a session isn't "editable", it's a one-off self-report). Null
 * if there's no such action, or the item is past its due date and editing
 * hasn't been granted regardless (see `alwaysEditable` on the card). */
function editModalKeyFor(item: SpeakerChecklistItem, alwaysEditable: boolean): ChecklistModalKey | null {
    if (!alwaysEditable && item.isPastDue) return null
    const definition = SPEAKER_CHECKLIST_ITEMS.find((d) => d.key === item.key)
    const modalAction = definition?.actions.find((a) => 'kind' in a)
    return modalAction && 'kind' in modalAction ? modalAction.modalKey : null
}

/** Renders one entry from an item's `actions` list — a modal trigger, a
 * static link, a config-supplied link (rendered only when that config value
 * is set), or a "self-report" button. */
function ChecklistActionButton({
    action,
    sessionizeId,
    ticketClaimUrl,
    backupSessionIds,
    onOpenModal,
}: {
    action: ChecklistItemAction
    sessionizeId: string
    ticketClaimUrl?: string
    backupSessionIds: string[]
    onOpenModal: (key: ChecklistModalKey) => void
}) {
    if ('kind' in action) {
        return (
            <button type="button" onClick={() => onOpenModal(action.modalKey)} className={actionLinkClass}>
                {action.buttonLabel}
            </button>
        )
    }

    // Dropped rather than rendered dead when the URL isn't configured.
    if ('configuredHref' in action) {
        if (!ticketClaimUrl) return null
        return (
            <AppLink unstyled to={ticketClaimUrl} target="_blank" rel="noreferrer" className={actionLinkClass}>
                {action.label}
            </AppLink>
        )
    }

    // Session-level, not speaker-level — submits acceptance for every one of
    // the viewer's own outstanding backup sessions at once (a dual-speaker
    // session only needs one presenter to accept it; see markBackupAccepted).
    if (action.action === 'accept-backup') {
        return (
            <Form method="post">
                <input type="hidden" name="_action" value="accept-backup" />
                {backupSessionIds.map((id) => (
                    <input key={id} type="hidden" name="sessionizeSessionId" value={id} />
                ))}
                <button type="submit" className={claimButtonClass} disabled={backupSessionIds.length === 0}>
                    {action.label}
                </button>
            </Form>
        )
    }

    if (action.action) {
        return (
            <Form method="post">
                <input type="hidden" name="_action" value={action.action} />
                <input type="hidden" name="targetSessionizeId" value={sessionizeId} />
                <button type="submit" className={claimButtonClass}>
                    {action.label}
                </button>
            </Form>
        )
    }

    if (!action.href) return null
    return (
        <AppLink unstyled to={action.href} target="_blank" rel="noreferrer" className={actionLinkClass}>
            {action.label}
        </AppLink>
    )
}

/** Every action for one outstanding item, driven by its entry in
 * `SPEAKER_CHECKLIST_ITEMS`. Renders nothing once the item is done, or if it
 * somehow has no matching definition. */
function ChecklistAction({
    item,
    sessionizeId,
    ticketClaimUrl,
    backupSessionIds,
    onOpenModal,
}: {
    item: SpeakerChecklistItem
    sessionizeId: string
    ticketClaimUrl?: string
    backupSessionIds: string[]
    onOpenModal: (key: ChecklistModalKey) => void
}) {
    if (item.done) return null

    const definition = SPEAKER_CHECKLIST_ITEMS.find((d) => d.key === item.key)
    if (!definition) return null

    return (
        <Flex align="center" gap="3" wrap="wrap">
            {definition.actions.map((action, index) => (
                <ChecklistActionButton
                    key={index}
                    action={action}
                    sessionizeId={sessionizeId}
                    ticketClaimUrl={ticketClaimUrl}
                    backupSessionIds={backupSessionIds}
                    onOpenModal={onOpenModal}
                />
            ))}
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
    backupSessionIds = [],
    onOpenModal,
    alwaysEditable = false,
}: {
    sessionizeId: string
    checklist: SpeakerChecklistItem[]
    ticketClaimUrl?: string
    /** The viewer's own sessions still needing backup-speaker acceptance —
     * see `SpeakerDashboardView.backupSessionIds`. */
    backupSessionIds?: string[]
    onOpenModal: (key: ChecklistModalKey) => void
    /** Lets a completed modal-based item be reopened even past its due
     * date — set by the admin preview, where an organiser acting on a
     * speaker's behalf shouldn't be locked out by a deadline aimed at
     * speakers. */
    alwaysEditable?: boolean
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
                    <Box role="status" mb="6" p="4" bg="status.success.bg" borderRadius="md" fontSize="sm" color="status.success.fg">
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
                                    backupSessionIds={backupSessionIds}
                                    onOpenModal={onOpenModal}
                                />
                            </Flex>
                        ))}
                    </Flex>
                )}

                {completed.length > 0 && (
                    <Flex direction="column" gap="1">
                        {completed.map((item) => {
                            const editModalKey = editModalKeyFor(item, alwaysEditable)
                            const content = (
                                <>
                                    <styled.span fontSize="sm" aria-hidden>
                                        ✅
                                    </styled.span>
                                    <styled.span fontSize="xs" color="admin.600" textDecoration="line-through" flex="1">
                                        {item.label}
                                    </styled.span>
                                    {editModalKey && (
                                        <styled.span fontSize="xs" color="admin.700" textDecoration="underline" flexShrink="0">
                                            Edit
                                        </styled.span>
                                    )}
                                </>
                            )

                            if (!editModalKey) {
                                return (
                                    <Flex key={item.key} align="center" gap="2" py="1.5" px="1">
                                        {content}
                                    </Flex>
                                )
                            }

                            return (
                                <styled.button
                                    key={item.key}
                                    type="button"
                                    onClick={() => onOpenModal(editModalKey)}
                                    display="flex"
                                    alignItems="center"
                                    gap="2"
                                    py="1.5"
                                    px="1"
                                    w="full"
                                    bg="transparent"
                                    border="none"
                                    borderRadius="sm"
                                    cursor="pointer"
                                    textAlign="left"
                                    _hover={{ bg: 'admin.100' }}
                                >
                                    {content}
                                </styled.button>
                            )
                        })}
                    </Flex>
                )}
            </AdminCard>
        </Box>
    )
}
