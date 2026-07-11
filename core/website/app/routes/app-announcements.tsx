import { CACHE_CONTROL } from '~/lib/http.server'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import type { Route } from './+types/app-announcements'

export interface GoogleFormUpdates {
    Timestamp: string
    Message: string
}

/** This route is used by the app for on the day announcements */
export async function loader({ context }: Route.LoaderArgs) {
    const year = getConferenceState(context).conference.year
    const announcements = await getServices(context).announcements.getActive(year)

    return new Response(JSON.stringify(announcements), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_CONTROL.announce,
            'Access-Control-Allow-Origin': '*',
        },
    })
}
