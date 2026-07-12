import { data } from 'react-router'
import { z } from 'zod'
import { resolveError } from '~/lib/resolve-error'
import { getRegistration, getTicket } from '~/lib/tito-api.server'
import { getConferenceState, getConfig } from '~/remix-app-load-context'
import type { Route } from './+types/api.tito-registration'

const RequestSchema = z.union([
    z.object({ registrationSlug: z.string().min(1) }),
    z.object({ ticketSlug: z.string().min(1) }),
])

export async function action({ request, context }: Route.ActionArgs) {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return data({ error: 'Invalid request' }, { status: 400 })
    }

    const ticketSales = getConferenceState(context).ticketSales
    const ticketInfo = ticketSales.state === 'open' ? ticketSales.ticketInfo : undefined
    if (ticketInfo?.type !== 'tito') {
        return data({ error: 'No Tito event configured' }, { status: 404 })
    }

    try {
        if ('ticketSlug' in parsed.data) {
            const ticket = await getTicket(
                getConfig(context).tito.apiToken,
                ticketInfo.accountId,
                ticketInfo.eventId,
                parsed.data.ticketSlug,
            )
            return data({ ticket })
        }

        const registration = await getRegistration(
            getConfig(context).tito.apiToken,
            ticketInfo.accountId,
            ticketInfo.eventId,
            parsed.data.registrationSlug,
        )
        return data({ registration })
    } catch (error) {
        return data({ error: resolveError(error).message }, { status: 502 })
    }
}
