import { registrationTypes } from '../events-air.server'

export const ticketTypeMapping = {
    'general-attendee': registrationTypes.Attendee,
    dqvd7i58iig: registrationTypes.Attendee,
    'general-attendee-company': registrationTypes.Attendee,
    'general-attendee-free': registrationTypes.Attendee,
    lyfer: registrationTypes.Attendee,
    volunteer: registrationTypes.Volunteer,
    speaker: registrationTypes.Speaker,
    sponsor: registrationTypes.Sponsor,
} as const
