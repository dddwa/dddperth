import { createConferenceDates, type ConferenceTimeOptions } from '@ddd/conference-config'
import { conferenceConfigPublic } from '@conference/config/public'

export { conferenceDate, Temporal } from '@ddd/conference-config'
export type { ConferenceTimeOptions } from '@ddd/conference-config'

export const { conferenceTime, conferenceDayStart, conferenceInstant } = createConferenceDates(conferenceConfigPublic.timezone)

/** For untrusted optional external timestamps; invalid values stay absent. */
export function tryConferenceTime(value: string, options?: ConferenceTimeOptions) {
    try {
        return conferenceTime(value, options)
    } catch {
        return undefined
    }
}
