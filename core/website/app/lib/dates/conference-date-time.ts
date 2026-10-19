import { conferenceConfigPublic } from '@conference/config/public'
import { DateTime, type DateTimeOptions, type DateTimeJSOptions, type DateObjectUnits } from 'luxon'

/**
 * Conference-local construction without depending on the full manifest (which
 * itself constructs dates). Explicit options can override the configured zone.
 * Current time belongs to the request's DateTimeProvider, not this module.
 */
export const conferenceDateTime = {
    fromISO(value: string, options?: DateTimeOptions) {
        return DateTime.fromISO(value, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
    fromMillis(value: number, options?: DateTimeJSOptions) {
        return DateTime.fromMillis(value, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
    fromSeconds(value: number, options?: DateTimeJSOptions) {
        return DateTime.fromSeconds(value, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
    fromJSDate(value: Date, options?: DateTimeJSOptions) {
        return DateTime.fromJSDate(value, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
    fromFormat(value: string, format: string, options?: DateTimeOptions) {
        return DateTime.fromFormat(value, format, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
    fromObject(value: DateObjectUnits, options?: DateTimeJSOptions) {
        return DateTime.fromObject(value, { ...options, zone: options?.zone ?? conferenceConfigPublic.timezone })
    },
}
