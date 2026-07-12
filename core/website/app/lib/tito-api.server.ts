const TITO_API_BASE = 'https://api.tito.io/v3'

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
) {
    const body = await titoGet(
        apiToken,
        `${accountSlug}/${eventSlug}/registrations/${encodeURIComponent(registrationSlug)}`,
    )
    return body.registration
}

export async function getTicket(
    apiToken: string | undefined,
    accountSlug: string,
    eventSlug: string,
    ticketSlug: string,
) {
    const body = await titoGet(apiToken, `${accountSlug}/${eventSlug}/tickets/${encodeURIComponent(ticketSlug)}`)
    return body.ticket
}
