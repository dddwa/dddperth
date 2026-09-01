import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getConfSessions } from '~/lib/sessionize.server'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import type { Route } from './+types/app-agenda-sessions'

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(getConferenceState(context).conference.year, getConfig(context))

    const sessions =
        yearConfig.kind !== 'cancelled' &&
        yearConfig.sessions?.kind === 'sessionize' &&
        yearConfig.sessions.sessionizeEndpoint
            ? await getConfSessions({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
              })
            : []

    const patchedSessions = sessions.map((session) => {
        if (session.isServiceSession) {
            // We need to override the room for service sessions
            session.room = 'Level 3'
        }

        return session
    })

    return new Response(JSON.stringify(patchedSessions), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_CONTROL.schedule,
            'Access-Control-Allow-Origin': '*',
        },
    })
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    return loaderHeaders
}
