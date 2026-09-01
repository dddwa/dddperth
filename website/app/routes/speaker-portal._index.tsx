import { useState } from 'react'
import { data, useActionData, useLoaderData } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { SpeakerChecklistCard, type ChecklistModalKey } from '~/components/speaker-checklist-card'
import { SpeakerCountdown } from '~/components/speaker-countdown'
import { SpeakerDinnerModal } from '~/components/speaker-dinner-modal'
import { SpeakerMeetTheExpertsModal } from '~/components/speaker-meet-the-experts-modal'
import { SpeakerReminderBanner } from '~/components/speaker-reminder-banner'
import { SpeakerSessionDetailsModal } from '~/components/speaker-session-details-modal'
import { SpeakerTrainingModal } from '~/components/speaker-training-modal'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireSpeaker } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import { buildSpeakerDashboardView } from '~/lib/speakers/dashboard-view.server'
import { emptyToUndefined, parseMeetTheExpertsForm, parseSessionDetailsForm, parseSpeakerProfileForm } from '~/lib/speakers/profile-form.server'
import { SPEAKER_TRAINING_SESSION_OPTIONS, YES_NO_MAYBE_OPTIONS, type SpeakerTrainingSession, type YesNoMaybe } from '~/lib/services/speakers-store'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/speaker-portal._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { speaker } = await requireSpeaker(request, context)
    const services = getServices(context)

    const [workspace, meetTheExpertsRegistration] = await Promise.all([
        services.speakers.getWorkspace(speaker.sessionizeId),
        services.meetTheExperts.getRegistration('speaker', speaker.sessionizeId),
    ])
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    return buildSpeakerDashboardView(context, workspace, speaker.sessionizeId, meetTheExpertsRegistration)
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

    // The whole "Fill in session details" modal submits as one form (one
    // Save button, no per-section targetSessionizeId) — handled before the
    // targetSessionizeId guard below, since this form has no such field.
    if (actionType === 'save-session-details-modal') {
        const sessionIds = formData.getAll('sessionIds').filter((v): v is string => typeof v === 'string')
        const presenterIds = formData.getAll('presenterIds').filter((v): v is string => typeof v === 'string')

        // Any presenter on a session may submit its shared details on the
        // group's behalf; a presenter's own fields may be submitted by any
        // co-presenter sharing a session with them. Same authorization idiom
        // as save-profile used to use, just checked per id in the batch.
        for (const sessionizeSessionId of sessionIds) {
            const onSession = await services.speakers.isSpeakerOnSession(speaker.sessionizeId, sessionizeSessionId)
            if (!onSession) throw new Response('Not Found', { status: 404 })
        }
        const allowedIds = await services.speakers.getCoPresenterIds(speaker.sessionizeId)
        for (const presenterId of presenterIds) {
            if (!allowedIds.includes(presenterId)) throw new Response('Not Found', { status: 404 })
        }

        for (const sessionizeSessionId of sessionIds) {
            await services.speakers.saveSessionDetails(
                sessionizeSessionId,
                parseSessionDetailsForm(formData, sessionizeSessionId),
                user.email,
            )
        }
        for (const presenterId of presenterIds) {
            await services.speakers.saveProfile(presenterId, parseSpeakerProfileForm(formData, presenterId), user.email)
        }

        return data({ sessionDetailsSaved: true })
    }

    // Session-level, not speaker-level — a dual-speaker session only needs
    // one presenter to accept it. Handled before the targetSessionizeId
    // guard below, since this form submits sessionizeSessionId(s) instead.
    if (actionType === 'accept-backup') {
        const sessionIds = formData.getAll('sessionizeSessionId').filter((v): v is string => typeof v === 'string')
        for (const id of sessionIds) {
            const onSession = await services.speakers.isSpeakerOnSession(speaker.sessionizeId, id)
            if (!onSession) throw new Response('Not Found', { status: 404 })
        }
        for (const id of sessionIds) {
            await services.speakers.markBackupAccepted(id, user.email)
        }
        return data({ backupAccepted: true })
    }

    const targetSessionizeId = formData.get('targetSessionizeId')
    if (typeof targetSessionizeId !== 'string' || !targetSessionizeId) {
        return data({ error: 'Missing target speaker' }, { status: 400 })
    }

    // claim-ticket, rsvp-training, rsvp-dinner, confirm-session and
    // save-meet-the-experts are all personal — always the logged-in
    // speaker's own answer, never a co-presenter's.
    if (actionType === 'claim-ticket') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        await services.speakers.markTicketClaimed(speaker.sessionizeId, user.email)
        return data({ ticketClaimed: true })
    }

    if (actionType === 'confirm-session') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        const justConfirmed = await services.speakers.markSessionConfirmed(speaker.sessionizeId, user.email)
        const notifyEmail = conferenceManifest.speakerPortal?.sessionConfirmationNotifyEmail
        if (justConfirmed && notifyEmail) {
            try {
                await services.email.send({
                    to: notifyEmail,
                    subject: `${speaker.fullName} confirmed their session in Sessionize`,
                    text: `${speaker.fullName} (${user.email}) marked their session as confirmed in Sessionize via the speaker portal.`,
                    html: `<p><strong>${speaker.fullName}</strong> (${user.email}) marked their session as confirmed in Sessionize via the speaker portal.</p>`,
                })
            } catch (error) {
                // The self-report already landed — don't fail the request
                // over a notification that can be resent/checked manually.
                recordException(error)
            }
        }
        return data({ sessionConfirmed: true })
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
        const dietaryRequirements = emptyToUndefined(formData.get('dietaryRequirements'))
        await services.speakers.saveSpeakerDinnerRsvp(speaker.sessionizeId, response, dietaryRequirements, user.email)
        return data({ dinnerRsvped: true })
    }

    if (actionType === 'save-meet-the-experts') {
        if (targetSessionizeId !== speaker.sessionizeId) throw new Response('Not Found', { status: 404 })
        const { slots, bioUseSessionizeBio, bioCustomText } = parseMeetTheExpertsForm(formData)
        await services.meetTheExperts.saveRegistration(
            'speaker',
            speaker.sessionizeId,
            { slots, bioUseDefault: bioUseSessionizeBio, bioCustomText },
            user.email,
        )
        return data({ meetTheExpertsSaved: true })
    }

    return data({ error: 'Unknown action' }, { status: 400 })
}

export default function SpeakerPortalDashboard() {
    const view = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [openModal, setOpenModal] = useState<ChecklistModalKey | null>(null)

    const sessionDetailsJustSaved = Boolean(actionData && 'sessionDetailsSaved' in actionData)
    const trainingJustResponded = Boolean(actionData && 'trainingRsvped' in actionData)
    const dinnerJustResponded = Boolean(actionData && 'dinnerRsvped' in actionData)
    const meetTheExpertsJustResponded = Boolean(actionData && 'meetTheExpertsSaved' in actionData)

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
                backupSessionIds={view.backupSessionIds}
                onOpenModal={setOpenModal}
            />

            <SpeakerSessionDetailsModal
                open={openModal === 'sessionDetails'}
                onOpenChange={(open) => setOpenModal(open ? 'sessionDetails' : null)}
                activeSessionizeId={view.sessionizeId}
                sessions={view.sessionDetailsSections}
                justSaved={sessionDetailsJustSaved}
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
                currentDietaryRequirements={view.dinnerDietaryRequirements}
                justResponded={dinnerJustResponded}
            />

            <SpeakerMeetTheExpertsModal
                open={openModal === 'meetTheExperts'}
                onOpenChange={(open) => setOpenModal(open ? 'meetTheExperts' : null)}
                sessionizeId={view.sessionizeId}
                slots={view.meetTheExpertsSlots}
                selectedSlotIds={view.meetTheExpertsSelectedSlotIds}
                hasResponded={view.meetTheExpertsResponded}
                justResponded={meetTheExpertsJustResponded}
                bio={view.meetTheExpertsBio}
                bioUseSessionizeBio={view.meetTheExpertsBioUseSessionizeBio}
                bioCustomText={view.meetTheExpertsBioCustomText}
                sessionDetailsIntroText={view.sessionDetailsIntroText}
            />

            <SpeakerWorkspaceView sessionizeId={view.sessionizeId} sessions={view.sessions} infoPackUrl={view.infoPackUrl} />
        </>
    )
}
