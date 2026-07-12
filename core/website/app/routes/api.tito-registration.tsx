import { data } from 'react-router'
import { z } from 'zod'
import { getYearConfig } from '~/lib/get-year-config.server'
import { resolveError } from '~/lib/resolve-error'
import { getRegistration, getTicket, type TitoTicket } from '~/lib/tito-api.server'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import type { Route } from './+types/api.tito-registration'

const RequestSchema = z.union([
    z.object({ registrationSlug: z.string().min(1) }),
    z.object({ ticketSlug: z.string().min(1) }),
])

/**
 * Tito ticket/registration objects carry attendee PII (email, IP, payment refs) — only display
 * fields leave the server. Tito uses empty strings (not null) for unset names, so normalise
 * with || to keep downstream ?? / || fallback chains working.
 */
function toPublicTicket(ticket: TitoTicket) {
    return {
        name: ticket.name || undefined,
        first_name: ticket.first_name || undefined,
        last_name: ticket.last_name || undefined,
        release_title: ticket.release_title || undefined,
    }
}

function isAttendeeRelease(ticket: TitoTicket, titlePrefixes: string[] | undefined): boolean {
    if (!titlePrefixes?.length) return true
    const title = ticket.release_title?.toLowerCase()
    return titlePrefixes.some((prefix) => title?.startsWith(prefix.toLowerCase()))
}

export async function action({ request, context }: Route.ActionArgs) {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return data({ error: 'Invalid request' }, { status: 400 })
    }

    const conferenceState = getConferenceState(context)
    const ticketSales = conferenceState.ticketSales
    const ticketInfo = ticketSales.state === 'open' ? ticketSales.ticketInfo : undefined
    if (ticketInfo?.type !== 'tito') {
        return data({ error: 'No Tito event configured' }, { status: 404 })
    }

    const yearConfig = getYearConfig(conferenceState.conference.year)
    const titlePrefixes = yearConfig.kind === 'conference' ? yearConfig.sharecast?.releaseTitlePrefixes : undefined

    try {
        if ('ticketSlug' in parsed.data) {
            const ticket = await getTicket(
                getConfig(context).tito.apiToken,
                ticketInfo.accountId,
                ticketInfo.eventId,
                parsed.data.ticketSlug,
            )
            return data({ ticket: toPublicTicket(ticket) })
        }

        const registration = await getRegistration(
            getConfig(context).tito.apiToken,
            ticketInfo.accountId,
            ticketInfo.eventId,
            parsed.data.registrationSlug,
        )
        return data({
            registration: {
                name: registration.name || undefined,
                tickets: (registration.tickets ?? [])
                    .filter((ticket) => isAttendeeRelease(ticket, titlePrefixes))
                    .map(toPublicTicket),
            },
        })
    } catch (error) {
        return data({ error: resolveError(error).message }, { status: 502 })
    }
}
