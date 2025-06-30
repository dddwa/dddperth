import { data } from 'react-router'
import type { TypeOf } from 'zod'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { speakersSchema } from '~/lib/sessionize.server'
import { getConfSpeakers } from '~/lib/sessionize.server'
import type { Route } from './+types/app-agenda-speakers'

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const speakers: TypeOf<typeof speakersSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getConfSpeakers({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfigPublic.timezone,
              })
            : []

    return data(speakers, {
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
