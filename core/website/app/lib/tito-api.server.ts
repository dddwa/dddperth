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

/**
 * Registrations/tickets are immutable once purchased, and share links arrive in
 * bursts when Tito sends a batch of confirmation emails — a short cache keeps
 * those bursts off Tito's rate limit. Uses a named worker cache so entries are
 * keyed per Tito URL and never shared with the public zone cache.
 */
const CACHE_TTL_SECONDS = 300

async function titoGet(apiToken: string | undefined, path: string) {
    if (!apiToken) {
        throw new Error('TITO_API_TOKEN is not set')
    }

    const url = `${TITO_API_BASE}/${path}`
    const cache = await caches.open('tito-api')
    const cached = await cache.match(url)
    if (cached) {
        return (await cached.json()) as Record<string, unknown>
    }

    const res = await fetch(url, {
        headers: {
            Authorization: `Token token=${apiToken}`,
            Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
        throw new Error(`Tito API ${res.status}: ${await res.text()}`)
    }

    const body = (await res.json()) as Record<string, unknown>
    await cache.put(
        url,
        new Response(JSON.stringify(body), {
            headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_TTL_SECONDS}` },
        }),
    )
    return body
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
    if (!body.registration) {
        throw new Error('Tito response is missing the registration')
    }
    return body.registration as TitoRegistration
}

export async function getTicket(
    apiToken: string | undefined,
    accountSlug: string,
    eventSlug: string,
    ticketSlug: string,
): Promise<TitoTicket> {
    const body = await titoGet(apiToken, `${accountSlug}/${eventSlug}/tickets/${encodeURIComponent(ticketSlug)}`)
    if (!body.ticket) {
        throw new Error('Tito response is missing the ticket')
    }
    return body.ticket as TitoTicket
}
