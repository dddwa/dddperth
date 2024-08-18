import { DateTime } from 'luxon'

export interface DateTimeProvider {
    now(): number
    nowDate(): DateTime

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setTimeout<TArgs extends any[]>(callback: (...args: TArgs) => void, ms?: number, ...args: TArgs): NodeJS.Timeout
    setTimeout(callback: (args: void) => void, ms?: number): NodeJS.Timeout
    clearTimeout(timeout: NodeJS.Timeout): void
}
