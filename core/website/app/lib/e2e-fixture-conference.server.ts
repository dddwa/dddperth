import type { ConferenceConfig } from '@ddd/conference-config'
import { FIXTURE_CONFERENCE_COOKIE, FIXTURE_CONFERENCES } from '../../e2e/fixtures/conference-year'

/**
 * Dev-only: swaps the request's conferences for `e2e/fixtures/conference-year.ts`
 * when the browser context carries `FIXTURE_CONFERENCE_COOKIE`.
 *
 * **This file is dead code in any production build**, on the same terms as
 * `dates/dev-date-time-provider.server.ts`: its only caller
 * (`load-context.server.ts`) imports it behind a production-mode check that
 * Vite folds away, and `dates/dev-date-override.test.ts` greps the built
 * worker for the cookie name. Shipping it would let anyone with a cookie
 * replace the site's whole conference calendar.
 */
export function fixtureConferencesFromRequest(headers: Headers): ConferenceConfig | null {
    const cookies = headers.get('Cookie') ?? ''
    const opted = cookies.split(';').some((part) => part.trim().startsWith(`${FIXTURE_CONFERENCE_COOKIE}=`))
    return opted ? FIXTURE_CONFERENCES : null
}
