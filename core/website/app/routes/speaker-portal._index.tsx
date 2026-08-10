import { useState } from 'react'
import { data, useActionData, useLoaderData } from 'react-router'
import { SpeakerChecklistCard, type ChecklistModalKey } from '~/components/speaker-checklist-card'
import { SpeakerCountdown } from '~/components/speaker-countdown'
import { SpeakerDinnerModal } from '~/components/speaker-dinner-modal'
import { SpeakerReminderBanner } from '~/components/speaker-reminder-banner'
import { SpeakerSessionDetailsModal } from '~/components/speaker-session-details-modal'
import { SpeakerTrainingModal } from '~/components/speaker-training-modal'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireSpeaker } from '~/lib/auth.server'
import { buildSpeakerDashboardView } from '~/lib/speakers/dashboard-view.server'
import { parseSpeakerProfileForm } from '~/lib/speakers/profile-form.server'
import { SPEAKER_TRAINING_SESSION_OPTIONS, YES_NO_MAYBE_OPTIONS, type SpeakerTrainingSession, type YesNoMaybe } from '~/lib/services/speakers-store'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/speaker-portal._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { speaker } = await requireSpeaker(request, context)
    const services = getServices(context)

    const workspace = await services.speakers.getWorkspace(speaker.sessionizeId)
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    return buildSpeakerDashboardView(context, workspace, speaker.sessionizeId)
}

function oneOf<T extends string>(value: FormDataEntryValue | null, options: readonly T[]): T | undefined {
    return typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : undefined
}

function allOf<T extends string>(values: FormDataEntryValue[], options: readonly T[]): T[] {
    return values.filter((v): v is T => typeof v === 'string' && (options as readonly string[]).includes(v))
}

export async function action({ request, context }: Route.ActionArgs) {
    const { user, speaker } = await requireSpeaker(request, context)
    const services = getServices(context)

    const formData = await request.formData()
    const actionType = formData.get('_action')
    const targetSessionizeId = formData.get('targetSessionizeId')
    if (typeof targetSessionizeId !== 'string' || !targetSessionizeId) {
        return data({ error: 'Missing target speaker' }, { status: 400 })
    }

    // claim-ticket, rsvp-training and rsvp-dinner are all personal — always
    // the logged-in speaker's own answer, never a co-presenter's.
    if (actionType === 'claim-ticket') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        await services.speakers.markTicketClaimed(speaker.sessionizeId, user.email)
        return data({ ticketClaimed: true })
    }

    if (actionType === 'rsvp-training') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        const sessions = allOf<SpeakerTrainingSession>(
            formData.getAll('rsvpSpeakerTraining'),
            SPEAKER_TRAINING_SESSION_OPTIONS,
        )
        await services.speakers.saveSpeakerTrainingRsvp(speaker.sessionizeId, sessions, user.email)
        return data({ trainingRsvped: true })
    }

    if (actionType === 'rsvp-dinner') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        const response = oneOf<YesNoMaybe>(formData.get('rsvpSpeakersDinner'), YES_NO_MAYBE_OPTIONS)
        if (!response) return data({ error: 'Missing RSVP response' }, { status: 400 })
        await services.speakers.saveSpeakerDinnerRsvp(speaker.sessionizeId, response, user.email)
        return data({ dinnerRsvped: true })
    }

    if (actionType !== 'save-profile') {
        return data({ error: 'Unknown action' }, { status: 400 })
    }

    // Either speaker on a shared session can fill this in for the other —
    // anyone outside that set gets a 404, same as a direct profile-route hit.
    const allowedIds = await services.speakers.getCoPresenterIds(speaker.sessionizeId)
    if (!allowedIds.includes(targetSessionizeId)) {
        throw new Response('Not Found', { status: 404 })
    }

    await services.speakers.saveProfile(targetSessionizeId, parseSpeakerProfileForm(formData), user.email)

    return data({ savedFor: targetSessionizeId })
}

export default function SpeakerPortalDashboard() {
    const view = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [openModal, setOpenModal] = useState<ChecklistModalKey | null>(null)

    const savedFor = actionData && 'savedFor' in actionData ? actionData.savedFor : null
    const trainingJustResponded = Boolean(actionData && 'trainingRsvped' in actionData)
    const dinnerJustResponded = Boolean(actionData && 'dinnerRsvped' in actionData)

    return (
        <>
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
        </>
    )
}
