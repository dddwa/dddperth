import { data } from 'react-router'
import type { TypeOf } from 'zod'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { sessionsSchema } from '~/lib/sessionize.server'
import { getConfSessions } from '~/lib/sessionize.server'
import type { Route } from './+types/app-agenda-sessions'

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind === 'sessionize' && !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const sessions: TypeOf<typeof sessionsSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getConfSessions({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfigPublic.timezone,
              })
            : []

    const patchedSessions = sessions.map((session) => {
        const groupSessions = session.sessions.map((inner) => {
            if (inner.isServiceSession) {
                // We need to override the room for service sessions
                inner.room = 'Level 3'
            }

            return inner
        })

        return { ...session, sessions: groupSessions }
    })

    return data(patchedSessions, {
        headers: {
            'Cache-Control': CACHE_CONTROL.schedule,
            'Access-Control-Allow-Origin': '*',
        },
    })
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    // Inherit the caching headers from the loader so we don't cache 404s
    return loaderHeaders
}
