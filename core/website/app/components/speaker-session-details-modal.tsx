import type { SpeakerProfile } from '~/lib/services/speakers-store'
import { SpeakerModal } from '~/components/speaker-modal'
import { SpeakerProfileForm } from '~/components/speaker-profile-form'
import { css } from '~/styled-system/css'
import { Box, styled } from '~/styled-system/jsx'

const detailsClass = css({
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
 * "Fill in session details" modal — one collapsible section per presenter on
 * the session, open by default for `activeSessionizeId` (the logged-in
 * speaker on their own dashboard, or the previewed speaker on the admin
 * page) and collapsed for any co-presenters.
 */
export function SpeakerSessionDetailsModal({
    open,
    onOpenChange,
    activeSessionizeId,
    presenters,
    justSavedFor,
    meetTheExpertsSlots,
}: {
    open: boolean
    onOpenChange: (open: boolean) => void
    activeSessionizeId: string
    presenters: Array<{ sessionizeId: string; fullName: string; bio?: string; profile: SpeakerProfile | null }>
    justSavedFor: string | null
    meetTheExpertsSlots: Array<{ id: string; label: string }>
}) {
    return (
        <SpeakerModal title="Session details" open={open} onOpenChange={onOpenChange}>
            {presenters.length === 0 ? (
                <styled.p fontSize="sm" color="admin.600">
                    No sessions found yet — check back after the next sync.
                </styled.p>
            ) : (
                presenters.map((presenter) => (
                    <styled.details
                        key={presenter.sessionizeId}
                        open={presenter.sessionizeId === activeSessionizeId}
                        className={detailsClass}
                    >
                        <styled.summary className={summaryClass}>{presenter.fullName}</styled.summary>
                        <Box mt="3">
                            <SpeakerProfileForm
                                sessionizeId={presenter.sessionizeId}
                                fullName={presenter.fullName}
                                bio={presenter.bio}
                                profile={presenter.profile}
                                justSaved={justSavedFor === presenter.sessionizeId}
                                meetTheExpertsSlots={meetTheExpertsSlots}
                            />
                        </Box>
                    </styled.details>
                ))
            )}
        </SpeakerModal>
    )
}
