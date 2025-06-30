import {
    type EventsAirContactData,
    checkIfContactExistsByExternalIdentifier,
    createEventsAirContact,
    updateEventsAirContact,
} from '~/lib/events-air.server'

export async function ensureContactExistsByExternalId(
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
