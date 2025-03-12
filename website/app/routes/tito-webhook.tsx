import { trace } from '@opentelemetry/api'
import type { ActionFunction } from 'react-router'
import { data } from 'react-router'
import { conferenceConfig } from '~/config/conference-config'
import type { ConferenceYear, Year } from '~/lib/config-types'
import { EVENTS_AIR_EVENT_ID } from '~/lib/config.server'
import type { EventsAirContactData } from '~/lib/events-air.server'
import {
    checkIfContactExistsByExternalIdentifier,
    createEventsAirContact,
    createEventsAirRegistration,
    deleteRegistration,
    getAccessToken,
    getContactRegistrations,
    registrationTypes,
    updateEventsAirContact,
} from '~/lib/events-air.server'
import { resolveError } from '~/lib/resolve-error'
import { TitoPayloadSchema } from '~/lib/tito.server'

const ticketTypeMapping = {
    'general-attendee': registrationTypes.Attendee,
    dqvd7i58iig: registrationTypes.Attendee,
    'general-attendee-company': registrationTypes.Attendee,
    'general-attendee-free': registrationTypes.Attendee,
    lyfer: registrationTypes.Attendee,
    volunteer: registrationTypes.Volunteer,
    speaker: registrationTypes.Speaker,
    sponsor: registrationTypes.Sponsor,
} as const

export const action: ActionFunction = async ({ request, context }) => {
    const configForYear = (conferenceConfig.conferences as unknown as Record<Year, ConferenceYear | undefined>)[
        context.conferenceState.conference.year
    ]
    const payload = await request.json()
    const webhookType = request.headers.get('X-Webhook-Name')

    // Validate the payload using Zod
    const parsedPayload = TitoPayloadSchema.safeParse(payload)
    if (!parsedPayload.success) {
        trace.getActiveSpan()?.addEvent('Failed to parse Tito payload', {
            error: JSON.stringify(parsedPayload.error),
        })
        return data({ success: false, error: 'Invalid Tito payload' }, { status: 400 })
    }

    const { slug, release_slug, email, first_name, last_name, responses, upgrade_ids } = parsedPayload.data

    const isGeneralTicket = configForYear?.ticketInfo?.generalTicketSlugs?.includes(release_slug)
    const isAfterPartyTicket = configForYear?.ticketInfo?.afterPartyTicketSlugs?.includes(release_slug)
    const hasAfterPartyUpgrade = upgrade_ids?.includes(configForYear?.ticketInfo?.afterPartyUpgradeActivityId ?? '')

    if (!isGeneralTicket && !isAfterPartyTicket) {
        trace.getActiveSpan()?.addEvent('Unknown ticket type', { release_slug })
        // Not a ticket we care about
        return data({ success: true })
    }

    if (!EVENTS_AIR_EVENT_ID) {
        trace.getActiveSpan()?.recordException(new Error('EVENTS_AIR_EVENT_ID is not set'))
        return data({ success: true })
    }

    const accessToken = await getAccessToken()
    const externalIdentifier = slug
    const eventId = EVENTS_AIR_EVENT_ID

    if (isAfterPartyTicket) {
        // We don't handle re-assignment of dedicated after party tickets. This will have to be resolved on the day
        if (webhookType === 'ticket.completed' || webhookType === 'ticket.updated') {
            // There will be a race condition here if someone buys both tickets, to keep things simple and avoid a queue
            // we will just sleep for 5 seconds to give the other webhook time to process. It should be fine
            // as the ticket assignment is second, so really should never cause a problem
            await new Promise((resolve) => setTimeout(resolve, 5_00))
            const existingTicketHolder = await checkIfContactExistsByExternalIdentifier(
                accessToken,
                eventId,
                externalIdentifier,
            )

            if (existingTicketHolder) {
                await updateEventsAirContact(accessToken, { userDefinedField3: 'Y' }, existingTicketHolder.id)
            }
        }

        return data({ success: true })
    }

    const lunch = configForYear?.foodInfo?.lunch.find(
        (lunch) => lunch.meal === responses['please-indicate-lunch-preference'],
    )

    const contactData: EventsAirContactData = {
        firstName: first_name,
        lastName: last_name,
        primaryEmail: email,
        externalIdentifier: slug,
        userDefinedField1: responses['what-is-your-pronoun'],
        userDefinedField2: lunch ? `${lunch.foodZone} (${lunch.shortCode})` : 'TBD',
        // We don't set 'N' here, as we don't want to clear the after party upgrade if it was set and we update the ticket holder
        userDefinedField3: hasAfterPartyUpgrade ? 'Y' : undefined,
    }

    await trace.getTracer('default').startActiveSpan('processTitoWebhook', async (span) => {
        try {
            if (
                webhookType === 'ticket.completed' ||
                webhookType === 'ticket.updated' ||
                webhookType === 'ticket.unvoided' ||
                // Note, ticket re-assignment we will just update the name of the contact
                webhookType === 'ticket.reassigned'
            ) {
                // Randomly wait between 0-5 seconds to hopefully mitigate the race conditions around double
                // events being sent from Tito
                await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 5_000)))

                const contactId = await ensureContactExistsByExternalId(
                    accessToken,
                    externalIdentifier,
                    eventId,
                    contactData,
                )

                await ensureRegistrationExists(release_slug, accessToken, contactId, eventId)
            }

            if (webhookType === 'ticket.voided') {
                const existingTicketHolder = await checkIfContactExistsByExternalIdentifier(
                    accessToken,
                    eventId,
                    externalIdentifier,
                )

                if (existingTicketHolder) {
                    const registrations = await getContactRegistrations(accessToken, eventId, existingTicketHolder.id)
                    const existingRegistrationOfType = registrations.find(
                        (reg) => reg.type.id === ticketTypeMapping[release_slug as keyof typeof ticketTypeMapping],
                    )

                    if (existingRegistrationOfType) {
                        await deleteRegistration(
                            accessToken,
                            eventId,
                            existingTicketHolder.id,
                            existingRegistrationOfType.id,
                        )
                    }
                }
            }
            // Leaving this here, which will instead remove the external id of the current ticket holder
            // Then ensure a new contact is created with the ticket's external id, and fixes up the registrations
            // else if (webhookType === 'ticket.reassigned') {
            //     const existingTicketHolder = await checkIfContactExistsByExternalIdentifier(
            //         accessToken,
            //         eventId,
            //         externalIdentifier,
            //     )

            //     // Remove externalIdentifier from the existing ticket holder
            //     if (existingTicketHolder) {
            //         await updateEventsAirContact(
            //             accessToken,
            //             { ...contactData, externalIdentifier: null },
            //             existingTicketHolder.id,
            //         )
            //         // TODO Remove the current ticket holder's registration
            //     }

            //     const contactId = await ensureContactExistsByEmail(accessToken, email, eventId, contactData)
            //     await ensureRegistrationExists(release_slug, accessToken, contactId, eventId)
            // }
        } catch (error) {
            console.error('Error processing Tito webhook:', error)
            trace.getActiveSpan()?.recordException(resolveError(error))
            return data({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        } finally {
            span.end()
        }
    })

    return data({ success: true })
}

async function ensureContactExistsByExternalId(
    accessToken: string,
    externalIdentifier: string,
    eventId: string,
    contactData: EventsAirContactData,
) {
    const contactExists = await checkIfContactExistsByExternalIdentifier(accessToken, eventId, externalIdentifier)
    let createdContactId: string | undefined

    if (contactExists) {
        await updateEventsAirContact(accessToken, contactData, contactExists.id)
    } else {
        createdContactId = await createEventsAirContact(accessToken, {
            ...contactData,
            // Default new contact to not having an after party upgrade
            userDefinedField3: contactData.userDefinedField3 ?? 'N',
            eventId,
        })
    }

    const contactId = contactExists?.id ?? createdContactId
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return contactId!
}

// async function ensureContactExistsByEmail(
//     accessToken: string,
//     email: string,
//     eventId: string,
//     contactData: EventsAirContactData,
// ) {
//     const contactExists = await checkIfContactExistsByEmail(accessToken, eventId, email)
//     let createdContactId: string | undefined

//     if (contactExists) {
//         await updateEventsAirContact(accessToken, contactData, contactExists.id)
//     } else {
//         createdContactId = await createEventsAirContact(accessToken, {
//             ...contactData,
//             eventId,
//         })
//     }

//     const contactId = contactExists?.id ?? createdContactId
//     return contactId!
// }

async function ensureRegistrationExists(release_slug: string, accessToken: string, contactId: string, eventId: string) {
    const mappedTicketType = ticketTypeMapping[release_slug as keyof typeof ticketTypeMapping]
    const registrations = await getContactRegistrations(accessToken, eventId, contactId)
    const existingRegistrationOfType = registrations.find((reg) => reg.type.id === mappedTicketType)

    if (!existingRegistrationOfType) {
        await createEventsAirRegistration(accessToken, {
            eventId,
            contactId,
            paymentDetails: {
                adjustmentAmount: 0,
                paymentStatus: 'INCLUSIVE',
            },
            registrationTypeId: mappedTicketType,
            dateTime: new Date().toISOString(),
        })
    }
}
