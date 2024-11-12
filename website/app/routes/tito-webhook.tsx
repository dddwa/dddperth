import { trace } from '@opentelemetry/api'
import { ActionFunction, json } from '@remix-run/node'
import {
    checkIfContactExists,
    createEventsAirContact,
    EventsAirContactData,
    getAccessToken,
    updateEventsAirContact,
} from '~/lib/events-air.server'
import { resolveError } from '~/lib/resolve-error'
import { TitoPayloadSchema } from '~/lib/tito.server'

export const action: ActionFunction = async ({ request }) => {
    const payload = await request.json()

    console.log('payload', payload)
    // Validate the payload using Zod
    const parsedPayload = TitoPayloadSchema.safeParse(payload)
    if (!parsedPayload.success) {
        return json({ success: false, error: 'Invalid Tito payload' }, { status: 400 })
    }

    const {
        ticket: {
            first_name,
            last_name,
            email,
            reference: uniqueTicketURL,
            metadata: { pronoun, food_zone, after_party } = {},
        },
    } = parsedPayload.data

    const accessToken = await getAccessToken()

    const externalIdentifier = uniqueTicketURL.replace('https://ti.to/organization/event/', '')

    const contactData: EventsAirContactData = {
        firstName: first_name,
        lastName: last_name,
        primaryEmail: email,
        externalIdentifier,
        userDefinedField1: pronoun,
        userDefinedField2: food_zone,
        userDefinedField3: after_party,
    }

    try {
        const contactExists = await checkIfContactExists(accessToken, externalIdentifier)

        if (contactExists) {
            await updateEventsAirContact(accessToken, contactData, contactExists.id)
        } else {
            await createEventsAirContact(accessToken, contactData)
        }

        return json({ success: true })
    } catch (error) {
        console.error('Error processing Tito webhook:', error)
        trace.getActiveSpan()?.recordException(resolveError(error))
        return json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
    }
}
