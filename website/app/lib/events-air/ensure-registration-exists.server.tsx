import { createEventsAirRegistration, getContactRegistrations } from '~/lib/events-air.server'
import { ticketTypeMapping } from './ticket-mapping.server'

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
export async function ensureRegistrationExists(
    release_slug: string,
    accessToken: string,
    contactId: string,
    eventId: string,
) {
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
