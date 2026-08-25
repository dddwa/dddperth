import { DateTime } from 'luxon'
import { conferenceManifest } from '@conference/manifest'
import type { DateTimeProvider } from './date-time-provider.server'

/**
 * Dev-only date override, read from an unsigned `__devDateOverride` cookie.
 *
 * **This file is dead code in any production build.** Its only caller
 * (`load-context.server.ts`) guards the call with `import.meta.env.DEV`,
 * which Vite statically replaces with `false` when building — so the branch,
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
    private constructor(private readonly _override: DateTime) {}

    /**
     * Returns a provider only when a valid override cookie is present;
     * otherwise null, so the caller falls through to the normal provider.
     */
    static fromRequest(requestHeaders: Headers): DevDateTimeProvider | null {
        const cookieHeader = requestHeaders.get('cookie')
        if (!cookieHeader) return null

        const raw = parseCookie(cookieHeader, DEV_DATE_OVERRIDE_COOKIE)
        if (!raw) return null

        // The app sets `Settings.throwOnInvalid = true` (app/root.tsx), so an
        // unparseable value throws here rather than returning an invalid
        // DateTime — a malformed cookie would otherwise 500 every request
        // until the user worked out which cookie to clear.
        let override: DateTime
        try {
            override = DateTime.fromISO(decodeURIComponent(raw), {
                zone: conferenceManifest.public.timezone,
            })
        } catch {
            console.warn(`[dev] ignoring unparseable ${DEV_DATE_OVERRIDE_COOKIE} cookie: ${raw}`)
            return null
        }

        if (!override.isValid) {
            console.warn(`[dev] ignoring invalid ${DEV_DATE_OVERRIDE_COOKIE} cookie: ${raw}`)
            return null
        }

        return new DevDateTimeProvider(override)
    }

    nowDate(): DateTime {
        return this._override
    }

    now(): number {
        return this._override.toMillis()
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
