import type { Temporal } from '~/lib/dates/temporal'
import { conferenceTime } from '~/lib/dates/temporal'
import { getUser, isAdminUser } from '../auth.server'
import type { AppServices } from '../services/app-services'
import type { DateTimeProvider } from './date-time-provider.server'
import { SystemDateTimeProvider } from './system-date-time-provider.server'

export class AdminDateTimeProvider implements DateTimeProvider {
    private _override: Temporal.ZonedDateTime | undefined
    private _system = new SystemDateTimeProvider()

    static async create(requestHeaders: Headers, services: AppServices): Promise<AdminDateTimeProvider> {
        const provider = new AdminDateTimeProvider()

        const user = await getUser(requestHeaders, services)
        if (!(await isAdminUser(user, services))) {
            return provider
        }

        const session = await services.sessions.adminDateTime.getSession(requestHeaders.get('cookie'))
        const overrideDate = session.get('adminDateOverride')

        if (overrideDate) {
            try {
                provider._override = conferenceTime(overrideDate)
            } catch {
                return provider
            }
            console.log('Admin date override active:', provider._override.toString({ timeZoneName: 'never', fractionalSecondDigits: 3 }))
        }

        return provider
    }

    private constructor() {}

    nowDate(): Temporal.ZonedDateTime {
        return this._override ?? this._system.nowDate()
    }

    now() {
        return this._override?.epochMilliseconds ?? this._system.now()
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
