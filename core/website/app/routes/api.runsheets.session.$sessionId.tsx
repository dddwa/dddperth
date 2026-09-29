import { conferenceManifest } from '@conference/manifest'
import { data, type LoaderFunctionArgs } from 'react-router'
import { getYearConfig } from '~/lib/get-year-config.server'
import { getPublishedSchedule } from '~/lib/published-agenda.server'
import { recordException } from '~/lib/record-exception'
import { toRunsheetSessionDetail } from '~/lib/runsheets/runsheet-session.server'
import { getConfSpeakers } from '~/lib/sessionize.server'
import type { SpeakerProfile } from '~/lib/services/speakers-store'
import { getConferenceState, getConfig, getServices } from '~/remix-app-load-context'

/**
 * GET /api/runsheets/session/:sessionId — the run sheet's session modal.
 *
 * Public, like the run sheet itself, so two things bound it: the talk must be
 * on the *published* agenda (otherwise this would confirm talks before they're
 * announced), and the response is built by `toRunsheetSessionDetail`, which
 * only carries the session-running fields of what speakers gave the portal.
 *
 * Failures come back as `null` with an error status rather than being thrown:
 * the modal loads this through a fetcher, and a thrown response would swap
 * the whole run sheet for the route's error page.
 */
export async function loader({ params, context }: LoaderFunctionArgs) {
    if (!conferenceManifest.runsheets) {
        return data(null, { status: 404 })
    }

    try {
        return await loadSessionDetail(params.sessionId, context)
    } catch (error) {
        recordException(error, { attributes: { route: 'api.runsheets.session' } })
        return data(null, { status: 500 })
    }
}

async function loadSessionDetail(sessionId: string | undefined, context: LoaderFunctionArgs['context']) {
    const { year } = getConferenceState(context).conference
    const schedule = await getPublishedSchedule(context, year)
    const session = schedule?.rooms
        .flatMap((room) => room.sessions)
        .find((candidate) => candidate.id === sessionId && !candidate.isServiceSession)
    if (!session) {
        return data(null, { status: 404 })
    }

    const yearConfig = getYearConfig(year, getConfig(context))
    const sessionizeEndpoint =
        yearConfig.kind === 'conference' && yearConfig.sessions?.kind === 'sessionize'
            ? yearConfig.sessions.sessionizeEndpoint
            : undefined

    const { speakers: store } = getServices(context)
    const [speakers, sessionDetails, profiles] = await Promise.all([
        sessionizeEndpoint ? getConfSpeakers({ sessionizeEndpoint }) : [],
        store.getSessionDetails(session.id),
        Promise.all(session.speakers.map(({ id }) => store.getProfile(id))),
    ])

    return data(
        toRunsheetSessionDetail({
            session,
            speakers,
            profiles: new Map(
                profiles.filter((profile): profile is SpeakerProfile => !!profile).map((p) => [p.sessionizeId, p]),
            ),
            sessionDetails,
            pronouns: conferenceManifest.runsheets?.speakerPronouns,
        }),
        // Speakers can still be editing their details, so keep this short.
        { headers: { 'Cache-Control': 'max-age=60' } },
    )
}
