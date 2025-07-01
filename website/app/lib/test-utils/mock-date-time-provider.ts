import type { DateTime } from 'luxon'
import type { DateTimeProvider } from '../dates/date-time-provider.server'

/**
 * Mock DateTimeProvider for testing that returns a fixed date/time.
 * Use this in tests to simulate specific dates and test time-dependent logic.
 */
export class MockDateTimeProvider implements DateTimeProvider {
    constructor(private mockDate: DateTime) {}

    nowDate(): DateTime {
        return this.mockDate
    }

    now(): number {
        return this.mockDate.toMillis()
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