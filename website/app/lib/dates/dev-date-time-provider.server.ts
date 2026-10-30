import type { Temporal } from '~/lib/dates/temporal'
import { conferenceDayStart, conferenceTime } from '~/lib/dates/temporal'
import type { DateTimeProvider } from './date-time-provider.server'

/**
 * Dev-only date override, read from an unsigned `__devDateOverride` cookie.
 *
 * **This file is dead code in any production build.** Its only caller
 * (`load-context.server.ts`) guards the call with a production-mode check,
 * which Vite statically folds away when building — so the branch,
 * this import, and this module are dropped by dead-code elimination. There
 * is a test (`dev-date-override.test.ts`) asserting the built worker
 * contains no trace of the cookie name, so this can't silently start
 * shipping.
 *
 * Why this exists: several conference states (voting open, agenda
 * published, CFP open) are purely date-driven, and the only existing way to
 * reach them is the admin override — which needs a D1 `auth_allowlist` row
 * and a magic-link login. That's too much machinery for an e2e suite, and
 * it would put auth in the failure path of every test that just wants to
 * see the voting page.
 *
 * Why a cookie rather than a dev-only endpoint that sets server state: a
 * cookie is per-browser-context, so Playwright workers can run different
 * dates concurrently without stepping on each other. Shared server state
 * would force the suite to run serially.
 *
 * The value is an ISO 8601 datetime, e.g. `2026-07-15T10:00:00`.
 */
export const DEV_DATE_OVERRIDE_COOKIE = '__devDateOverride'

export class DevDateTimeProvider implements DateTimeProvider {
    private constructor(private readonly _override: Temporal.ZonedDateTime) {}

    /**
     * Returns a provider only when a valid override cookie is present;
     * otherwise null, so the caller falls through to the normal provider.
     */
    static fromRequest(requestHeaders: Headers): DevDateTimeProvider | null {
        const cookieHeader = requestHeaders.get('cookie')
        if (!cookieHeader) return null

        const raw = parseCookie(cookieHeader, DEV_DATE_OVERRIDE_COOKIE)
        if (!raw) return null

        // Malformed cookies must fall back to the real clock.
        let override: Temporal.ZonedDateTime
        try {
            const value = decodeURIComponent(raw)
            override = /^\d{4}-\d{2}-\d{2}$/.test(value) ? conferenceDayStart(value) : conferenceTime(value)
        } catch {
            console.warn(`[dev] ignoring unparseable ${DEV_DATE_OVERRIDE_COOKIE} cookie: ${raw}`)
            return null
        }

        return new DevDateTimeProvider(override)
    }

    nowDate(): Temporal.ZonedDateTime {
        return this._override
    }

    now(): number {
        return this._override.epochMilliseconds
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

function parseCookie(cookieHeader: string, name: string): string | undefined {
    for (const part of cookieHeader.split(';')) {
        const index = part.indexOf('=')
        if (index === -1) continue
        if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim()
    }
    return undefined
}
