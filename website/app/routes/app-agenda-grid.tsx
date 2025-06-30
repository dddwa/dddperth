import { data } from 'react-router'
import type { TypeOf } from 'zod'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { getYearConfig } from '~/lib/get-year-config.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { gridSmartSchema } from '~/lib/sessionize.server'
import { getScheduleGrid } from '~/lib/sessionize.server'
import type { Route } from './+types/app-agenda-grid'

export async function loader({ context }: Route.LoaderArgs) {
    const yearConfig = getYearConfig(context.conferenceState.conference.year)

    if (yearConfig.kind === 'cancelled') {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    if (yearConfig.sessions?.kind === 'sessionize' && !yearConfig.sessions.sessionizeEndpoint) {
        throw new Response(JSON.stringify({ message: 'No sessionize endpoint for year' }), { status: 404 })
    }

    const schedules: TypeOf<typeof gridSmartSchema> =
        yearConfig.sessions?.kind === 'sessionize'
            ? await getScheduleGrid({
                  sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint,
                  confTimeZone: conferenceConfigPublic.timezone,
              })
            : // TODO Deal with data type
              []

    const patchedSchedules = schedules.map((schedule) => {
        const patchedTimeSlot = schedule.timeSlots.map((timeSlot) => {
            const patchedRooms = timeSlot.rooms.map((slotRooms) => {
                if (slotRooms.session.isServiceSession) {
                    // We need to override the room for service sessions
                    return { ...slotRooms, session: { ...slotRooms.session, room: 'Level 3' } }
                }

                return slotRooms
            })

            return { ...timeSlot, rooms: patchedRooms }
        })

        return {
            ...schedule,
            timeSlots: patchedTimeSlot,
        }
    })

    return data(patchedSchedules, {
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
