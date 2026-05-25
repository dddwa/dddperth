import type { Route } from './+types/app-announcements'
import { CACHE_CONTROL } from '~/lib/http.server'

export interface GoogleFormUpdates {
    Timestamp: string
    Message: string
}

/** This route is used by the app for on the day announcements */
export async function loader({ context }: Route.LoaderArgs) {
    const year = context.conferenceState.conference.year
    const announcements = await context.services.announcements.getActive(year)

    return new Response(JSON.stringify(announcements), {
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': CACHE_CONTROL.announce,
            'Access-Control-Allow-Origin': '*',
        },
    })
}
