import { DateTime } from 'luxon'
import type { RouterContext } from 'react-router'
import { conferenceManifest } from '@conference/manifest'
import { getConferenceState, getDateTimeProvider } from '~/remix-app-load-context'
import type { ReminderEvent } from '~/components/speaker-reminder-banner'
import type { TrainingSessionView } from '~/components/speaker-training-modal'
import { buildCalendarDataUrl } from './calendar.server'
import { speakerChecklist, upcomingRsvpedEvents, type SpeakerChecklistItem, type SpeakerSessionChecklistInput } from './checklist'
import {
    toSessionDetailsSections,
    toWorkspaceView,
    type SpeakerSessionDetailsSection,
    type SpeakerWorkspaceSessionView,
} from './workspace-view.server'
import type { SpeakerWorkspace, YesNoMaybe } from '../services/speakers-store'

/**
 * Everything both the speaker's own `/speaker-portal` and the admin
 * `/admin/speakers/$sessionizeId` preview need to render the dashboard —
 * countdown, reminder banner, checklist, and the 4 modals' data. One builder
 * so the two pages can never drift, same idiom as `toWorkspaceView` /
 * `toSessionDetailsSections` / `parseSpeakerProfileForm`.
 */
export interface SpeakerDashboardView {
    sessionizeId: string
    sessions: SpeakerWorkspaceSessionView[]
    infoPackUrl?: string
    sessionDetailsSections: SpeakerSessionDetailsSection[]

    checklist: SpeakerChecklistItem[]
    ticketClaimUrl?: string

    conferenceName: string
    conferenceDateLabel: string | null
    daysUntilConference: number | null

    reminders: ReminderEvent[]

    trainingSessions: TrainingSessionView[]
    trainingResponded: boolean
    trainingSelectedIds: string[]

    dinnerDateLabel: string | null
    dinnerCalendarUrl: string | null
    dinnerResponse: YesNoMaybe | undefined

    meetTheExpertsSlots: Array<{ id: string; label: string }>
    meetTheExpertsResponded: boolean
    meetTheExpertsSelectedSlotIds: string[]
    /** Sessionize bio — the Meet the Experts modal's read-only bio default. */
    meetTheExpertsBio?: string
    meetTheExpertsBioUseSessionizeBio: boolean
    meetTheExpertsBioCustomText?: string
    /** Their custom on-stage intro from the session-details form, if any —
     * seeds the Meet the Experts bio the first time it's unlocked. */
    sessionDetailsIntroText?: string
}

export function buildSpeakerDashboardView(
    context: { get<T>(context: RouterContext<T>): T },
    workspace: SpeakerWorkspace,
    targetSessionizeId: string,
): SpeakerDashboardView {
    const now = getDateTimeProvider(context).nowDate()
    const conferenceDateIso = getConferenceState(context).conference.date
    const timezone = conferenceManifest.public.timezone
    const conferenceDate = conferenceDateIso ? DateTime.fromISO(conferenceDateIso, { zone: timezone }) : null

    const checklistConfig = conferenceManifest.speakerPortal?.checklist
    const sessionDetailsSections = toSessionDetailsSections(workspace)
    const ownProfile =
        workspace.sessions
            .flatMap(({ presenters }) => presenters)
            .find((p) => p.speaker.sessionizeId === targetSessionizeId)?.profile ?? null

    const checklistSessions: SpeakerSessionChecklistInput[] = workspace.sessions.map(({ session, sessionDetails }) => ({
        status: session.status,
        isConfirmed: session.isConfirmed,
        sessionDetailsComplete: Boolean(sessionDetails?.questionsPreference),
    }))
    const checklist = speakerChecklist(ownProfile, checklistSessions, now)

    const reminders = upcomingRsvpedEvents(
        ownProfile,
        {
            speakerTrainingSessions: checklistConfig?.speakerTrainingSessions,
            speakerDinner: checklistConfig?.speakerDinner,
        },
        now,
    ).map((event) => ({
        label: event.label,
        dateLabel: formatEventDate(event.dateTime),
    }))

    const trainingSessions: TrainingSessionView[] = (checklistConfig?.speakerTrainingSessions ?? []).map((session) => ({
        id: session.id,
        title: session.title,
        dateLabel: formatEventDate(session.dateTime),
        calendarUrl: buildCalendarDataUrl({
            title: `Speaker Training — ${session.title}`,
            description: session.title,
            start: session.dateTime,
            end: session.endDateTime,
        }),
    }))

    const dinnerConfig = checklistConfig?.speakerDinner

    return {
        ...toWorkspaceView(workspace),
        infoPackUrl: conferenceManifest.speakerPortal?.infoPackUrl,
        sessionDetailsSections,

        checklist,
        ticketClaimUrl: checklistConfig?.ticketClaimUrl,

        conferenceName: conferenceManifest.public.name,
        conferenceDateLabel: conferenceDate?.toLocaleString(DateTime.DATE_HUGE, { locale: 'en-AU' }) ?? null,
        daysUntilConference: conferenceDate ? Math.floor(conferenceDate.diff(now, 'days').days) : null,

        reminders,

        trainingSessions,
        trainingResponded: Boolean(ownProfile?.rsvpSpeakerTrainingRespondedAt),
        trainingSelectedIds: ownProfile?.rsvpSpeakerTraining ?? [],

        dinnerDateLabel: dinnerConfig ? formatEventDate(dinnerConfig.dateTime) : null,
        dinnerCalendarUrl: dinnerConfig
            ? buildCalendarDataUrl({
                  title: `${conferenceManifest.public.name} Speaker Dinner`,
                  start: dinnerConfig.dateTime,
                  end: dinnerConfig.endDateTime,
                  location: dinnerConfig.location,
              })
            : null,
        dinnerResponse: ownProfile?.rsvpSpeakersDinner,

        meetTheExpertsSlots: checklistConfig?.meetTheExpertsSlots ?? [],
        meetTheExpertsResponded: Boolean(ownProfile?.registerMeetTheExpertsRespondedAt),
        meetTheExpertsSelectedSlotIds: ownProfile?.registerMeetTheExpertsSlots ?? [],
        meetTheExpertsBio: workspace.speaker.bio,
        meetTheExpertsBioUseSessionizeBio: ownProfile?.meetTheExpertsBioUseSessionizeBio ?? true,
        meetTheExpertsBioCustomText: ownProfile?.meetTheExpertsBioCustomText,
        sessionDetailsIntroText: ownProfile?.introductionCustomText,
    }
}

function formatEventDate(dateTime: DateTime): string {
    return `${dateTime.weekdayShort} ${dateTime.toFormat('d LLL')}, ${dateTime.toLocaleString(DateTime.TIME_SIMPLE, { locale: 'en-AU' })}`
}
