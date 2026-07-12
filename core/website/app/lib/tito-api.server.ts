const TITO_API_BASE = 'https://api.tito.io/v3'

/**
 * The fields we consume from Tito ticket objects. The API returns far more —
 * including attendee PII (email, IP address, payment references) — so never
 * return these objects to clients wholesale; map to display fields first.
 */
export interface TitoTicket {
    slug?: string | null
    name?: string | null
    first_name?: string | null
    last_name?: string | null
    release_title?: string | null
    assigned?: boolean | null
}

export interface TitoRegistration {
    slug?: string | null
    name?: string | null
    tickets?: TitoTicket[]
}

async function titoGet(apiToken: string | undefined, path: string) {
    if (!apiToken) {
        throw new Error('TITO_API_TOKEN is not set')
    }

    const res = await fetch(`${TITO_API_BASE}/${path}`, {
        headers: {
            Authorization: `Token token=${apiToken}`,
            Accept: 'application/json',
        },
    })

    if (!res.ok) {
        throw new Error(`Tito API ${res.status}: ${await res.text()}`)
    }

    return (await res.json()) as Record<string, unknown>
}

export async function getRegistration(
    apiToken: string | undefined,
    accountSlug: string,
    eventSlug: string,
    registrationSlug: string,
): Promise<TitoRegistration> {
    const body = await titoGet(
        apiToken,
        `${accountSlug}/${eventSlug}/registrations/${encodeURIComponent(registrationSlug)}`,
    )
    return body.registration as TitoRegistration
}

export async function getTicket(
    apiToken: string | undefined,
    accountSlug: string,
    eventSlug: string,
    ticketSlug: string,
): Promise<TitoTicket> {
    const body = await titoGet(apiToken, `${accountSlug}/${eventSlug}/tickets/${encodeURIComponent(ticketSlug)}`)
    return body.ticket as TitoTicket
}
