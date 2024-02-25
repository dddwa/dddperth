import type { ConferenceVenue } from '../venues/venue'

/**
 * This year's conference configuration
 */
export interface ConferenceYear {
    year: string

    conferenceDate: Date | undefined

    venue: ConferenceVenue | undefined
}
