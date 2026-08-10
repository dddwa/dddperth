import { conferenceManifest } from '@conference/manifest'
import { data, useActionData, useLoaderData } from 'react-router'
import { SpeakerChecklistCard } from '~/components/speaker-checklist-card'
import { SpeakerProfileForm } from '~/components/speaker-profile-form'
import { SpeakerWorkspaceView } from '~/components/speaker-workspace-view'
import { requireSpeaker } from '~/lib/auth.server'
import { recordException } from '~/lib/record-exception'
import { speakerChecklist } from '~/lib/speakers/checklist'
import {
    PRESENTATION_DETAIL_OPTIONS,
    QUESTIONS_PREFERENCE_OPTIONS,
    SPEAKER_TRAINING_SESSION_OPTIONS,
    YES_NO_MAYBE_OPTIONS,
    YES_NO_MAYBE_OTHER_OPTIONS,
    type PresentationDetail,
    type QuestionsPreference,
    type SpeakerProfile,
    type SpeakerTrainingSession,
    type YesNoMaybe,
    type YesNoMaybeOther,
} from '~/lib/services/speakers-store'
import { toWorkspaceView } from '~/lib/speakers/workspace-view.server'
import { getServices } from '~/remix-app-load-context'
import { Box, styled } from '~/styled-system/jsx'
import type { Route } from './+types/speaker-portal._index'

export async function loader({ request, context }: Route.LoaderArgs) {
    const { speaker } = await requireSpeaker(request, context)
    const services = getServices(context)

    const workspace = await services.speakers.getWorkspace(speaker.sessionizeId)
    if (!workspace) {
        throw new Response('Not Found', { status: 404 })
    }

    // De-duped across sessions — a co-presenter appearing on more than one
    // shared session should still only get one form.
    const presentersById = new Map<string, { fullName: string; profile: SpeakerProfile | null }>()
    for (const { presenters } of workspace.sessions) {
        for (const { speaker: p, profile } of presenters) {
            if (!presentersById.has(p.sessionizeId)) {
                presentersById.set(p.sessionizeId, { fullName: p.fullName, profile })
            }
        }
    }

    const checklistConfig = conferenceManifest.speakerPortal?.checklist

    return {
        ...toWorkspaceView(workspace),
        infoPackUrl: conferenceManifest.speakerPortal?.infoPackUrl,
        presenters: [...presentersById.entries()].map(([sessionizeId, { fullName, profile }]) => ({
            sessionizeId,
            fullName,
            profile,
        })),
        checklist: speakerChecklist(
            presentersById.get(speaker.sessionizeId)?.profile ?? null,
            workspace.sessions.map(({ session }) => ({ status: session.status, isConfirmed: session.isConfirmed })),
            {
                sessionDetails: checklistConfig?.sessionDetailsDueDate,
                ticketClaim: checklistConfig?.ticketClaimDueDate,
                speakerTraining: checklistConfig?.speakerTrainingDueDate,
            },
        ),
        ticketClaimUrl: checklistConfig?.ticketClaimUrl,
        // The checklist's session-details/training items link to the
        // presenter's own card below — only there once they have a session.
        hasOwnProfileForm: presentersById.has(speaker.sessionizeId),
    }
}

function emptyToUndefined(value: FormDataEntryValue | null): string | undefined {
    if (typeof value !== 'string') return undefined
    const trimmed = value.trim()
    return trimmed.length > 0 ? trimmed : undefined
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

    if (actionType === 'claim-ticket') {
        // Personal, unlike the profile form — always the logged-in speaker's
        // own ticket, never a co-presenter's.
        await services.speakers.markTicketClaimed(speaker.sessionizeId, user.email)
        return data({ ticketClaimed: true })
    }

    if (actionType === 'confirm-session') {
        // Personal, same as claim-ticket — always the logged-in speaker's
        // own confirmation.
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

    if (actionType !== 'save-profile') {
        return data({ error: 'Unknown action' }, { status: 400 })
    }

    const targetSessionizeId = formData.get('targetSessionizeId')
    if (typeof targetSessionizeId !== 'string' || !targetSessionizeId) {
        return data({ error: 'Missing target speaker' }, { status: 400 })
    }

    // Either speaker on a shared session can fill this in for the other —
    // anyone outside that set gets a 404, same as a direct profile-route hit.
    const allowedIds = await services.speakers.getCoPresenterIds(speaker.sessionizeId)
    if (!allowedIds.includes(targetSessionizeId)) {
        throw new Response('Not Found', { status: 404 })
    }

    await services.speakers.saveProfile(
        targetSessionizeId,
        {
            namePhoneticSpelling: emptyToUndefined(formData.get('namePhoneticSpelling')),
            questionsPreference: oneOf<QuestionsPreference>(
                formData.get('questionsPreference'),
                QUESTIONS_PREFERENCE_OPTIONS,
            ),
            questionsPreferenceOther: emptyToUndefined(formData.get('questionsPreferenceOther')),
            presentationDetails: allOf<PresentationDetail>(
                formData.getAll('presentationDetails'),
                PRESENTATION_DETAIL_OPTIONS,
            ),
            presentationDetailsOther: emptyToUndefined(formData.get('presentationDetailsOther')),
            optOutOfRecording: formData.get('optOutOfRecording') === 'yes',
            introductionUseSessionizeBio: formData.get('introductionSource') !== 'custom',
            introductionCustomText: emptyToUndefined(formData.get('introductionCustomText')),
            anythingElse: emptyToUndefined(formData.get('anythingElse')),
            dietaryRequirements: emptyToUndefined(formData.get('dietaryRequirements')),
            rsvpSpeakersDinner: oneOf<YesNoMaybe>(formData.get('rsvpSpeakersDinner'), YES_NO_MAYBE_OPTIONS),
            rsvpSpeakerTraining: allOf<SpeakerTrainingSession>(
                formData.getAll('rsvpSpeakerTraining'),
                SPEAKER_TRAINING_SESSION_OPTIONS,
            ),
            registerMeetTheExperts: oneOf<YesNoMaybeOther>(
                formData.get('registerMeetTheExperts'),
                YES_NO_MAYBE_OTHER_OPTIONS,
            ),
            registerMeetTheExpertsOther: emptyToUndefined(formData.get('registerMeetTheExpertsOther')),
        },
        user.email,
    )

    return data({ savedFor: targetSessionizeId })
}

export default function SpeakerPortalDashboard() {
    const { sessionizeId, sessions, infoPackUrl, presenters, checklist, ticketClaimUrl, hasOwnProfileForm } =
        useLoaderData<typeof loader>()
    const actionData = useActionData<typeof action>()
    const savedFor = actionData && 'savedFor' in actionData ? actionData.savedFor : null

    return (
        <>
            <SpeakerChecklistCard
                sessionizeId={sessionizeId}
                checklist={checklist}
                ticketClaimUrl={ticketClaimUrl}
                hasOwnProfileForm={hasOwnProfileForm}
            />

            <SpeakerWorkspaceView sessionizeId={sessionizeId} sessions={sessions} infoPackUrl={infoPackUrl} />

            {presenters.length > 0 && (
                <Box maxW="4xl" mx="auto">
                    <styled.h2 fontSize="xl" fontWeight="semibold" mt="8" mb="4">
                        Extra info for the organisers
                    </styled.h2>
                    {presenters.map((presenter) => (
                        <SpeakerProfileForm
                            key={presenter.sessionizeId}
                            sessionizeId={presenter.sessionizeId}
                            fullName={presenter.fullName}
                            profile={presenter.profile}
                            justSaved={savedFor === presenter.sessionizeId}
                        />
                    ))}
                </Box>
            )}
        </>
    )
}
