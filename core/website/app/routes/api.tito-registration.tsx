import { data } from 'react-router'
import { z } from 'zod'
import { resolveError } from '~/lib/resolve-error'
import { getRegistration } from '~/lib/tito-api.server'
import type { Route } from './+types/api.tito-registration'

const RequestSchema = z.object({
    slug: z.string().min(1),
})

export async function action({ request, context }: Route.ActionArgs) {
    const parsed = RequestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
        return data({ error: 'Invalid request' }, { status: 400 })
    }

    const ticketSales = context.conferenceState.ticketSales
    const ticketInfo = ticketSales.state === 'open' ? ticketSales.ticketInfo : undefined
    if (ticketInfo?.type !== 'tito') {
        return data({ error: 'No Tito event configured' }, { status: 404 })
    }

    try {
        const registration = await getRegistration(
            context.config.tito.apiToken,
            ticketInfo.accountId,
            ticketInfo.eventId,
            parsed.data.slug,
        )
        return data({ registration })
    } catch (error) {
        return data({ error: resolveError(error).message }, { status: 502 })
    }
}
