import { useState } from 'react'
import { data, useActionData, useLoaderData } from 'react-router'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { SpeakerChecklistCard, type ChecklistModalKey } from '~/components/speaker-checklist-card'
import { SpeakerCountdown } from '~/components/speaker-countdown'
import { SpeakerDinnerModal } from '~/components/speaker-dinner-modal'
import { SpeakerReminderBanner } from '~/components/speaker-reminder-banner'
import { SpeakerSessionDetailsModal } from '~/components/speaker-session-details-modal'
import { SpeakerTrainingModal } from '~/components/speaker-training-modal'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireAdmin } from '~/lib/auth.server'
import { buildSpeakerDashboardView } from '~/lib/speakers/dashboard-view.server'
import { parseSpeakerProfileForm } from '~/lib/speakers/profile-form.server'
import { SPEAKER_TRAINING_SESSION_OPTIONS, YES_NO_MAYBE_OPTIONS, type SpeakerTrainingSession, type YesNoMaybe } from '~/lib/services/speakers-store'
import { getServices } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers.$sessionizeId'

/**
 * Admin view of exactly what a speaker sees at /speaker-portal — same data,
 * same components (`SpeakerChecklistCard`, the 3 RSVP modals, etc) as the
 * speaker's own dashboard via `buildSpeakerDashboardView`, so the two can
 * never drift. Unlike the speaker's own view, an admin can act on behalf of
 * *any* presenter here — there's no co-presenter/self restriction, since an
 * admin is already fully trusted.
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const workspace = await services.speakers.getWorkspace(params.sessionizeId)
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    return {
        fullName: workspace.speaker.fullName,
        ...buildSpeakerDashboardView(context, workspace, params.sessionizeId),
    }
}

function oneOf<T extends string>(value: FormDataEntryValue | null, options: readonly T[]): T | undefined {
    return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : undefined
}

function allOf<T extends string>(values: FormDataEntryValue[], options: readonly T[]): T[] {
    return values.filter((v): v is T => typeof v === 'string' && (options as readonly string[]).includes(v))
}

export async function action({ request, context }: Route.ActionArgs) {
    const { email } = await requireAdmin(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const actionType = formData.get('_action')
    const targetSessionizeId = formData.get('targetSessionizeId')
    if (typeof targetSessionizeId !== 'string' || !targetSessionizeId) {
        return data({ error: 'Missing target speaker' }, { status: 400 })
    }

    if (actionType === 'claim-ticket') {
        await services.speakers.markTicketClaimed(targetSessionizeId, email)
        return data({ ticketClaimed: true })
    }

    if (actionType === 'rsvp-training') {
        const sessions = allOf<SpeakerTrainingSession>(
            formData.getAll('rsvpSpeakerTraining'),
            SPEAKER_TRAINING_SESSION_OPTIONS,
        )
        await services.speakers.saveSpeakerTrainingRsvp(targetSessionizeId, sessions, email)
        return data({ trainingRsvped: true })
    }

    if (actionType === 'rsvp-dinner') {
        const response = oneOf<YesNoMaybe>(formData.get('rsvpSpeakersDinner'), YES_NO_MAYBE_OPTIONS)
        if (!response) return data({ error: 'Missing RSVP response' }, { status: 400 })
        await services.speakers.saveSpeakerDinnerRsvp(targetSessionizeId, response, email)
        return data({ dinnerRsvped: true })
    }

    if (actionType !== 'save-profile') {
        return data({ error: 'Unknown action' }, { status: 400 })
    }

    await services.speakers.saveProfile(targetSessionizeId, parseSpeakerProfileForm(formData), email)

    return data({ savedFor: targetSessionizeId })
}

export default function AdminSpeakerPreview() {
    const { fullName, ...view } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [openModal, setOpenModal] = useState<ChecklistModalKey | null>(null)

    const savedFor = actionData && 'savedFor' in actionData ? actionData.savedFor : null
    const trainingJustResponded = Boolean(actionData && 'trainingRsvped' in actionData)
    const dinnerJustResponded = Boolean(actionData && 'dinnerRsvped' in actionData)

    return (
        <AdminLayout heading={`Speaker view — ${fullName}`}>
            <Box mb="4">
                <AppLink to="/admin/speakers" color="admin.700" textDecoration="underline" fontSize="sm">
                    ← Back to speakers
                </AppLink>
            </Box>
            <Box mb="6" p="3" bg="status.info.bg" borderRadius="md" fontSize="sm" color="status.info.fg">
                This is exactly what <styled.strong>{fullName}</styled.strong> sees when they log into the speaker
                portal — including their checklist and RSVPs. Changes made here are saved on their behalf.
            </Box>

            {view.daysUntilConference !== null && view.conferenceDateLabel && (
                <SpeakerCountdown
                    conferenceName={view.conferenceName}
                    conferenceDateLabel={view.conferenceDateLabel}
                    daysUntil={view.daysUntilConference}
                />
            )}

            <SpeakerReminderBanner events={view.reminders} />

            <SpeakerChecklistCard
                sessionizeId={view.sessionizeId}
                checklist={view.checklist}
                ticketClaimUrl={view.ticketClaimUrl}
                onOpenModal={setOpenModal}
            />

            <SpeakerSessionDetailsModal
                open={openModal === 'sessionDetails'}
                onOpenChange={(open) => setOpenModal(open ? 'sessionDetails' : null)}
                activeSessionizeId={view.sessionizeId}
                presenters={view.presenters}
                justSavedFor={savedFor}
                meetTheExpertsSlots={view.meetTheExpertsSlots}
            />

            <SpeakerTrainingModal
                open={openModal === 'speakerTraining'}
                onOpenChange={(open) => setOpenModal(open ? 'speakerTraining' : null)}
                sessionizeId={view.sessionizeId}
                sessions={view.trainingSessions}
                selectedSessionIds={view.trainingSelectedIds}
                hasResponded={view.trainingResponded}
                justResponded={trainingJustResponded}
            />

            <SpeakerDinnerModal
                open={openModal === 'speakerDinner'}
                onOpenChange={(open) => setOpenModal(open ? 'speakerDinner' : null)}
                sessionizeId={view.sessionizeId}
                dateLabel={view.dinnerDateLabel ?? ''}
                calendarUrl={view.dinnerCalendarUrl ?? undefined}
                currentResponse={view.dinnerResponse}
                justResponded={dinnerJustResponded}
            />

            <SpeakerWorkspaceView sessionizeId={view.sessionizeId} sessions={view.sessions} infoPackUrl={view.infoPackUrl} />
        </AdminLayout>
    )
}
