import { DateTime } from 'luxon'
import { conferenceManifest } from '@conference/manifest'
import type { DateTimeProvider } from './date-time-provider.server'

export class SystemDateTimeProvider implements DateTimeProvider {
    nowDate(): DateTime {
        // eslint-disable-next-line dates/use-date-time-provider -- The system provider is the real clock behind request overrides.
        return DateTime.local({
            zone: conferenceManifest.public.timezone,
        })
    }
    now() {
        // eslint-disable-next-line dates/use-date-time-provider -- The system provider is the real clock behind request overrides.
        return DateTime.local({
            zone: conferenceManifest.public.timezone,
        }).toMillis()
    }

    setTimeout<TArgs extends any[]>(callback: (...args: TArgs) => void, ms?: number, ...args: TArgs): NodeJS.Timeout
    setTimeout(callback: (args: void) => void, ms?: number): NodeJS.Timeout
    setTimeout(callback: () => void, delay: number) {
        return setTimeout(callback, delay)
    }

    clearTimeout(timeout: NodeJS.Timeout) {
        clearTimeout(timeout)
    }
}
