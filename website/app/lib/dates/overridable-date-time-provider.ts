import type { Request } from 'express'
import { DateTime } from 'luxon'
import type { DateTimeProvider } from './date-time-provider.server'
import { SystemDateTimeProvider } from './system-date-time-provider.server'

export class OverridableDateTimeProvider implements DateTimeProvider {
    private _override: DateTime | undefined
    private _system = new SystemDateTimeProvider()

    constructor(query: Request['query']) {
        console.log('Query', query)
        if (query['date']) {
            this._override = DateTime.fromISO(query['date'] as string)
            console.log('Overriding date', this._override.toISO())
        }
    }

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
