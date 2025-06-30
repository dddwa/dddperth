import { DateTime } from 'luxon'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { getUser, isAdmin } from '~/lib/auth.server'
import { adminDateTimeSessionStorage } from '~/lib/session.server'
import type { DateTimeProvider } from './date-time-provider.server'
import { SystemDateTimeProvider } from './system-date-time-provider.server'

export class AdminDateTimeProvider implements DateTimeProvider {
    private _override: DateTime | undefined
    private _system = new SystemDateTimeProvider()

    static async create(requestHeaders: Headers): Promise<AdminDateTimeProvider> {
        const provider = new AdminDateTimeProvider()

        // Check if user is admin
        const user = await getUser(requestHeaders)
        if (!user || !isAdmin(user)) {
            return provider
        }

        // Check for date override in session
        const session = await adminDateTimeSessionStorage.getSession(requestHeaders.get('cookie'))
        const overrideDate = session.get('adminDateOverride')

        if (overrideDate) {
            provider._override = DateTime.fromISO(overrideDate, {
                zone: conferenceConfigPublic.timezone,
            })
            console.log('Admin date override active:', provider._override.toISO())
        }

        return provider
    }

    private constructor() {}

    nowDate(): DateTime {
        return this._override ?? this._system.nowDate()
    }

    now() {
        return this._override?.toMillis() ?? this._system.now()
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
