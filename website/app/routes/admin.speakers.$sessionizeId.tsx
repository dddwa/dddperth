import { useState } from 'react'
import { data, useActionData, useLoaderData } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { AdminLayout } from '~/components/admin-layout'
import { AppLink } from '~/components/app-link'
import { SpeakerChecklistCard, type ChecklistModalKey } from '~/components/speaker-checklist-card'
import { SpeakerCountdown } from '~/components/speaker-countdown'
import { SpeakerDinnerModal } from '~/components/speaker-dinner-modal'
import { SpeakerMeetTheExpertsModal } from '~/components/speaker-meet-the-experts-modal'
import { SpeakerReminderBanner } from '~/components/speaker-reminder-banner'
import { SpeakerSessionDetailsModal } from '~/components/speaker-session-details-modal'
import { SpeakerTrainingModal } from '~/components/speaker-training-modal'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireAdmin } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import { buildSpeakerDashboardView } from '~/lib/speakers/dashboard-view.server'
import { emptyToUndefined, parseMeetTheExpertsForm, parseSessionDetailsForm, parseSpeakerProfileForm } from '~/lib/speakers/profile-form.server'
import { SPEAKER_TRAINING_SESSION_OPTIONS, YES_NO_MAYBE_OPTIONS, type SpeakerTrainingSession, type YesNoMaybe } from '~/lib/services/speakers-store'
import { getServices } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/admin.speakers.$sessionizeId'

/**
 * Admin view of exactly what a speaker sees at /speaker-portal — same data,
 * same components (`SpeakerChecklistCard`, the 4 RSVP modals, etc) as the
 * speaker's own dashboard via `buildSpeakerDashboardView`, so the two can
 * never drift. Unlike the speaker's own view, an admin can act on behalf of
 * *any* presenter here — there's no co-presenter/self restriction, since an
 * admin is already fully trusted.
 */
export async function loader({ request, context, params }: Route.LoaderArgs) {
    await requireAdmin(request, context)
    const services = getServices(context)

    const [workspace, meetTheExpertsRegistration] = await Promise.all([
        services.speakers.getWorkspace(params.sessionizeId),
        services.meetTheExperts.getRegistration('speaker', params.sessionizeId),
    ])
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    return {
        fullName: workspace.speaker.fullName,
        ...buildSpeakerDashboardView(context, workspace, params.sessionizeId, meetTheExpertsRegistration),
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

    // The whole "Fill in session details" modal submits as one form (one
    // Save button, no per-section targetSessionizeId) — handled before the
    // targetSessionizeId guard below, since this form has no such field. No
    // ownership check needed — an admin is already fully trusted.
    if (actionType === 'save-session-details-modal') {
        const sessionIds = formData.getAll('sessionIds').filter((v): v is string => typeof v === 'string')
        const presenterIds = formData.getAll('presenterIds').filter((v): v is string => typeof v === 'string')

        for (const sessionizeSessionId of sessionIds) {
            await services.speakers.saveSessionDetails(
                sessionizeSessionId,
                parseSessionDetailsForm(formData, sessionizeSessionId),
                email,
            )
        }
        for (const presenterId of presenterIds) {
            await services.speakers.saveProfile(presenterId, parseSpeakerProfileForm(formData, presenterId), email)
        }

        return data({ sessionDetailsSaved: true })
    }

    // Session-level, not speaker-level — a dual-speaker session only needs
    // one presenter to accept it. Handled before the targetSessionizeId
    // guard below, since this form submits sessionizeSessionId(s) instead.
    // No ownership check needed — an admin is already fully trusted.
    if (actionType === 'accept-backup') {
        const sessionIds = formData.getAll('sessionizeSessionId').filter((v): v is string => typeof v === 'string')
        for (const id of sessionIds) {
            await services.speakers.markBackupAccepted(id, email)
        }
        return data({ backupAccepted: true })
    }

    const targetSessionizeId = formData.get('targetSessionizeId')
    if (typeof targetSessionizeId !== 'string' || !targetSessionizeId) {
        return data({ error: 'Missing target speaker' }, { status: 400 })
    }

    if (actionType === 'claim-ticket') {
        await services.speakers.markTicketClaimed(targetSessionizeId, email)
        return data({ ticketClaimed: true })
    }

    if (actionType === 'confirm-session') {
        const justConfirmed = await services.speakers.markSessionConfirmed(targetSessionizeId, email)
        const notifyEmail = conferenceManifest.speakerPortal?.sessionConfirmationNotifyEmail
        if (justConfirmed && notifyEmail) {
            const targetSpeaker = await services.speakers.getSpeaker(targetSessionizeId)
            const speakerLabel = targetSpeaker?.fullName ?? targetSessionizeId
            try {
                await services.email.send({
                    to: notifyEmail,
                    subject: `${speakerLabel}'s session marked confirmed (via admin)`,
                    text: `An admin (${email}) marked ${speakerLabel}'s session as confirmed in Sessionize on their behalf, via the admin speaker preview.`,
                    html: `<p>An admin (<strong>${email}</strong>) marked <strong>${speakerLabel}</strong>'s session as confirmed in Sessionize on their behalf, via the admin speaker preview.</p>`,
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
        const dietaryRequirements = emptyToUndefined(formData.get('dietaryRequirements'))
        await services.speakers.saveSpeakerDinnerRsvp(targetSessionizeId, response, dietaryRequirements, email)
        return data({ dinnerRsvped: true })
    }

    if (actionType === 'save-meet-the-experts') {
        const { slots, bioUseSessionizeBio, bioCustomText } = parseMeetTheExpertsForm(formData)
        await services.meetTheExperts.saveRegistration(
            'speaker',
            targetSessionizeId,
            { slots, bioUseDefault: bioUseSessionizeBio, bioCustomText },
            email,
        )
        return data({ meetTheExpertsSaved: true })
    }

    return data({ error: 'Unknown action' }, { status: 400 })
}

export default function AdminSpeakerPreview() {
    const { fullName, ...view } = useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const [openModal, setOpenModal] = useState<ChecklistModalKey | null>(null)

    const sessionDetailsJustSaved = Boolean(actionData && 'sessionDetailsSaved' in actionData)
    const trainingJustResponded = Boolean(actionData && 'trainingRsvped' in actionData)
    const dinnerJustResponded = Boolean(actionData && 'dinnerRsvped' in actionData)
    const meetTheExpertsJustResponded = Boolean(actionData && 'meetTheExpertsSaved' in actionData)

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
                backupSessionIds={view.backupSessionIds}
                onOpenModal={setOpenModal}
                alwaysEditable
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

            <SpeakerWorkspaceView sessionizeId={view.sessionizeId} sessions={view.sessions} infoPackUrl={view.infoPackUrl} isAdminView />
        </AdminLayout>
    )
}
