import type { z } from 'zod'
import type { Year } from '~/lib/conference-state-client-safe'
import { getYearConfig } from '~/lib/get-year-config.server'
import type { gridSmartSchema } from '~/lib/sessionize.server'
import { getScheduleGrid } from '~/lib/sessionize.server'
import { getConfig, getDateTimeProvider } from '~/remix-app-load-context'

type ScheduleDay = z.infer<typeof gridSmartSchema>[number]
type ContextReader = Parameters<typeof getConfig>[0]

/**
 * A year's agenda, but only once it has been published.
 *
 * Every public surface that exposes talks by id — the agenda grid, the
 * shortlist endpoint, the `.ics` export — must apply the same gate. Before
 * publication the Sessionize grid may already hold the draft schedule, and an
 * endpoint that looks talks up by id without this check turns into a way to
 * read (or confirm the existence of) talks that haven't been announced.
 *
 * Published means `agendaPublishedDateTime` has passed, or the conference day
 * has arrived even if no publication date was configured. Archived
 * `session-data` years are always published.
 */
export async function getPublishedSchedule(context: ContextReader, year: Year): Promise<ScheduleDay | undefined> {
    const yearConfig = getYearConfig(year, getConfig(context))
    if (yearConfig.kind !== 'conference') return undefined

    if (yearConfig.sessions?.kind === 'sessionize') {
        const now = getDateTimeProvider(context).nowDate()
        const published =
            (yearConfig.agendaPublishedDateTime ? now >= yearConfig.agendaPublishedDateTime : false) ||
            (!!yearConfig.conferenceDate && now >= yearConfig.conferenceDate)
        if (!published) return undefined
    }

    return getScheduleForOrganisers(context, year)
}

/**
 * A year's agenda whether or not it has been published — the draft
 * Sessionize grid included. **Admin-only**: see `getPublishedSchedule` for
 * why a public surface must never use this. Organisers need it to plan
 * around the agenda (e.g. volunteer rosters) before it's announced.
 */
export async function getScheduleForOrganisers(context: ContextReader, year: Year): Promise<ScheduleDay | undefined> {
    const yearConfig = getYearConfig(year, getConfig(context))
    if (yearConfig.kind !== 'conference') return undefined

    if (yearConfig.sessions?.kind === 'session-data') {
        return yearConfig.sessions.sessions[0]
    }

    if (yearConfig.sessions?.kind !== 'sessionize' || !yearConfig.sessions.sessionizeEndpoint) {
        return undefined
    }

    const schedules = await getScheduleGrid({ sessionizeEndpoint: yearConfig.sessions.sessionizeEndpoint })
    return schedules[0]
}

/** The talks on a schedule: every session except breaks and changeovers. */
export function scheduleTalks(schedule: ScheduleDay) {
    return schedule.rooms.flatMap((room) => room.sessions.filter((session) => !session.isServiceSession))
}
