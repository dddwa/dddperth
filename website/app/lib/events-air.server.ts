import type { CloudflareEnv } from '../remix-app-load-context'

interface TokenResponse {
    access_token: string
}

interface GraphQLResponse<T> {
    data: T
}

interface CreateContactData {
    createContact: { contact: { id: string } }
}

interface CreateRegistrationData {
    createContact: { contact: { id: string } }
}

interface UpdateContactData {
    updateContact: unknown
}

interface ContactsQueryData {
    event: { contacts: Array<{ id: string }> }
}

interface ContactRegistrationsData {
    event: { contact: { registrations: Array<{ id: string; type: { id: string } }> } }
}

// EventsAir contact data type
export interface EventsAirContactData {
    firstName: string | null
    lastName: string | null
    primaryEmail: string | null
    externalIdentifier: string | null
    userDefinedField1?: string
    userDefinedField2?: string
    userDefinedField3?: string
}

export async function getAccessToken(env: CloudflareEnv): Promise<string> {
    if (!env.EVENTS_AIR_CLIENT_ID || !env.EVENTS_AIR_CLIENT_SECRET) {
        throw new Error('EventsAir client ID and secret are not configured')
    }

    const tokenResponse = await fetch(
        `https://login.microsoftonline.com/${env.EVENTS_AIR_TENANT_ID}/oauth2/v2.0/token`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: env.EVENTS_AIR_CLIENT_ID,
                client_secret: env.EVENTS_AIR_CLIENT_SECRET,
                scope: 'https://eventsairprod.onmicrosoft.com/85d8f626-4e3d-4357-89c6-327d4e6d3d93/.default',
                grant_type: 'client_credentials',
            }).toString(),
        },
    )

    if (!tokenResponse.ok) {
        throw new Error('Failed to retrieve access token for EventsAir')
    }

    const { access_token }: TokenResponse = await tokenResponse.json()

    return access_token
}

const EVENTS_AIR_API_BASE_URL = 'https://api.eventsair.com/graphql'

export const registrationTypes = {
    Volunteer: '96099FA8-43E0-447F-9FCA-820BA01283E7',
    Sponsor: '44483936-B542-4996-9405-364EA3F7A6BE',
    Speaker: '1EA2CB0F-7946-4267-BF36-EE8484370A48',
    'Event Management': '7E5C05AB-55AA-4A67-A3ED-7AEF2605F167',
    'Event Crew': 'AA880F4B-61AB-4016-BE21-64952C9209D8',
    Attendee: '4101E07A-EC92-41F0-BDCB-A80D065A912A',
} as const

export async function createEventsAirContact(
    accessToken: string,
    createContactData: EventsAirContactData & { eventId: string },
): Promise<string> {
    const mutation = `
      mutation ($input: CreateContactInput!) {
        createContact(input: $input) {
          contact {
            id
          }
        }
      }
    `

    const variables = {
        input: createContactData,
    }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: mutation, variables }),
    })

    if (!response.ok) {
        console.error('Mutation error:', await response.text())
        throw new Error('Failed to create contact in EventsAir')
    }

    const data: GraphQLResponse<CreateContactData> = await response.json()
    console.log('Contact created:', JSON.stringify(data))
    return data?.data?.createContact?.contact?.id
}

export interface CreateRegistrationInput {
    contactId: string
    eventId: string
    registrationTypeId: (typeof registrationTypes)[keyof typeof registrationTypes]
    dateTime: string
    paymentDetails: {
        adjustmentAmount: number
        paymentStatus: 'INCLUSIVE'
    }
}

export async function createEventsAirRegistration(
    accessToken: string,
    createRegistrationInput: CreateRegistrationInput,
) {
    const mutation = `
      mutation CreateRegistration($input: CreateRegistrationInput!) {
        createRegistration(input: $input) {
          registration {
            id
          }
        }
      }
    `

    const variables = {
        input: createRegistrationInput,
    }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: mutation, variables }),
    })

    if (!response.ok) {
        console.error('Mutation error:', await response.text())
        throw new Error('Failed to create registration in EventsAir')
    }

    const data: GraphQLResponse<CreateRegistrationData> = await response.json()
    console.log('Registration created:', JSON.stringify(data))
    return data?.data?.createContact?.contact?.id
}

export async function updateEventsAirContact(
    accessToken: string,
    contactData: Partial<EventsAirContactData>,
    contactId: string,
) {
    const mutation = `
      mutation ($input: UpdateContactDetailsInput!) {
        updateContactDetails(input: $input) {
          contact {
            id
          }
        }
      }
    `

    const variables = {
        contactData: { ...contactData, contactId },
    }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: mutation, variables }),
    })

    if (!response.ok) {
        console.error('Mutation error:', await response.text())
        throw new Error('Failed to update contact in EventsAir')
    }

    const result: GraphQLResponse<UpdateContactData> = await response.json()
    console.log('Contact updated:', JSON.stringify(result))
    return result.data?.updateContact
}

export async function checkIfContactExistsByExternalIdentifier(
    accessToken: string,
    eventId: string,
    externalIdentifier: string,
): Promise<{ id: string } | null> {
    const query = `
      query ($eventId: ID!, $externalIdentifier: String!) {
        event(id: $eventId) {
          contacts(input: { contactFilter: { externalIdentifier: $externalIdentifier } }) {
            id
          }
        }
      }
    `

    const variables = { eventId, externalIdentifier }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        console.error('Query error:', await response.text())
        throw new Error('Failed to query contact existence in EventsAir')
    }

    const data: GraphQLResponse<ContactsQueryData> = await response.json()
    console.log('Contact query response:', JSON.stringify(data))
    const contact = data?.data?.event?.contacts?.[0]
    return contact ? { id: contact.id } : null
}

export async function checkIfContactExistsByEmail(
    accessToken: string,
    eventId: string,
    email: string,
): Promise<{ id: string } | null> {
    const query = `
      query ($eventId: ID!, $email: String!) {
        event(id: $eventId) {
          contacts(where: { email: $email }) {
            id
          }
        }
      }
    `

    const variables = { eventId, email }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        throw new Error('Failed to query contact existence in EventsAir')
    }

    const data: GraphQLResponse<ContactsQueryData> = await response.json()
    const contact = data?.data?.event?.contacts?.[0]
    return contact ? { id: contact.id } : null
}

export async function getContactRegistrations(
    accessToken: string,
    eventId: string,
    contactId: string,
): Promise<{ id: string; type: { id: string } }[]> {
    const query = `
      query ($eventId: ID!, $contactId: ID!) {
        event(id: $eventId) {
          contact(id: $contactId) {
            registrations {
              id
              type {
                id
              }
            }
          }
        }
      }
    `

    const variables = { eventId, contactId }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        throw new Error('Failed to fetch contact registrations in EventsAir')
    }

    const data: GraphQLResponse<ContactRegistrationsData> = await response.json()
    console.log('Contact registrations fetched:', JSON.stringify(data))
    return data?.data?.event?.contact?.registrations || []
}

export async function deleteRegistration(
    accessToken: string,
    contactId: string,
    eventId: string,
    registrationId: string,
): Promise<void> {
    const mutation = `
      mutation DeleteRegistration($input: DeleteRegistrationInput!) {
        deleteRegistration(input: $input)
      }
    `

    const variables = {
        input: {
            contactId,
            eventId,
            registrationId,
        },
    }

    const response = await fetch(EVENTS_AIR_API_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ query: mutation, variables }),
    })

    if (!response.ok) {
        throw new Error('Failed to delete registration in EventsAir')
    }
}
