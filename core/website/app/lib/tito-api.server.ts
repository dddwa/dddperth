const TITO_API_BASE = 'https://api.tito.io/v3'

export async function getRegistration(
    apiToken: string | undefined,
    accountSlug: string,
    eventSlug: string,
    registrationSlug: string,
) {
    if (!apiToken) {
        throw new Error('TITO_API_TOKEN is not set')
    }

    const url = `${TITO_API_BASE}/${accountSlug}/${eventSlug}/registrations/${registrationSlug}`
    const res = await fetch(url, {
        headers: {
            Authorization: `Token token=${apiToken}`,
            Accept: 'application/json',
        },
    })

    if (!res.ok) {
        throw new Error(`Tito API ${res.status}: ${await res.text()}`)
    }

    const body = (await res.json()) as { registration?: unknown }
    return body.registration
}
