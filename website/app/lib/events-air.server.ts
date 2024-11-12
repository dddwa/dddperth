import { EVENTS_AIR_CLIENT_ID, EVENTS_AIR_CLIENT_SECRET, EVENTS_AIR_TENANT_ID } from './config.server'

// EventsAir contact data type
export interface EventsAirContactData {
    firstName: string
    lastName: string
    primaryEmail: string
    externalIdentifier: string
    userDefinedField1?: string
    userDefinedField2?: string
    userDefinedField3?: string
}

export async function getAccessToken(): Promise<string> {
    if (!EVENTS_AIR_CLIENT_ID || !EVENTS_AIR_CLIENT_SECRET) {
        throw new Error('EventsAir client ID and secret are not configured')
    }

    const tokenResponse = await fetch(`https://login.microsoftonline.com/${EVENTS_AIR_TENANT_ID}/oauth2/v2.0/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: EVENTS_AIR_CLIENT_ID,
            client_secret: EVENTS_AIR_CLIENT_SECRET,
            scope: 'https://eventsairprod.onmicrosoft.com/85d8f626-4e3d-4357-89c6-327d4e6d3d93/.default',
            grant_type: 'client_credentials',
        }).toString(),
    })

    if (!tokenResponse.ok) {
        throw new Error('Failed to retrieve access token for EventsAir')
    }

    const { access_token } = await tokenResponse.json()

    return access_token
}

const EVENTS_AIR_API_BASE_URL = 'https://api.eventsair.com/v2'

export async function createEventsAirContact(accessToken: string, contactData: EventsAirContactData) {
    const response = await fetch(`${EVENTS_AIR_API_BASE_URL}/contacts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(contactData),
    })

    if (!response.ok) {
        throw new Error('Failed to create contact in EventsAir')
    }

    const createResult = response.json()
    console.log('Create result', createResult)
    return createResult
}

export async function updateEventsAirContact(
    accessToken: string,
    contactData: EventsAirContactData,
    contactId: string,
) {
    const response = await fetch(`${EVENTS_AIR_API_BASE_URL}/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(contactData),
    })

    if (!response.ok) {
        throw new Error('Failed to update contact in EventsAir')
    }

    const updateResult = response.json()
    console.log('Update result', updateResult)
    return updateResult
}

export async function checkIfContactExists(
    accessToken: string,
    externalIdentifier: string,
): Promise<{ id: string } | null> {
    // Example implementation for checking existing contact based on unique identifier
    const response = await fetch(`${EVENTS_AIR_API_BASE_URL}/contacts?externalIdentifier=${externalIdentifier}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (response.ok) {
        const data = await response.json()
        console.log('Check if exists', data)
        return data.length ? { id: data[0].id } : null
    }
    throw new Error('Failed to check contact existence in EventsAir')
}
