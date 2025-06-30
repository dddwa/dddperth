import { DateTime } from 'luxon'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import type { DateTimeProvider } from './date-time-provider.server'

export class SystemDateTimeProvider implements DateTimeProvider {
    nowDate(): DateTime {
        return DateTime.local({
            zone: conferenceConfigPublic.timezone,
        })
    }
    now() {
        return DateTime.local({
            zone: conferenceConfigPublic.timezone,
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
