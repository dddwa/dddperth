import { Temporal } from '~/lib/dates/temporal'
import { conferenceManifest } from '@conference/manifest'
import type { DateTimeProvider } from './date-time-provider.server'

export class SystemDateTimeProvider implements DateTimeProvider {
    nowDate(): Temporal.ZonedDateTime {
        // eslint-disable-next-line dates/use-date-time-provider -- The system provider is the real clock behind request overrides.
        return Temporal.Now.zonedDateTimeISO(conferenceManifest.public.timezone)
    }
    now() {
        // eslint-disable-next-line dates/use-date-time-provider -- The system provider is the real clock behind request overrides.
        return Temporal.Now.instant().epochMilliseconds
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
