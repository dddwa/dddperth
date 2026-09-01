import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `e2e/start-dev-server.mjs` runs under plain Node, so it can't import
 * `FIXTURE_YEAR` from `e2e/routes.ts` — that module resolves `@conference/*`
 * TypeScript path aliases. It therefore repeats the year as a literal, and
 * this test stops the two drifting apart.
 *
 * Drift is silent and expensive: the year would keep its configured endpoint
 * (or none), so the agenda renders "not announced yet" and the visual
 * baselines quietly become screenshots of an empty page.
 */
describe('e2e Sessionize fixture years', () => {
    const e2eDir = join(__dirname, '..', '..', 'e2e')

    it('covers the pinned FIXTURE_YEAR used by the route list', () => {
        const routes = readFileSync(join(e2eDir, 'routes.ts'), 'utf8')
        const fixtureYear = /export const FIXTURE_YEAR = '(\d{4})'/.exec(routes)?.[1]
        expect(fixtureYear, 'FIXTURE_YEAR not found in e2e/routes.ts').toBeTruthy()

        const server = readFileSync(join(e2eDir, 'start-dev-server.mjs'), 'utf8')
        const years = /const FIXTURE_ENDPOINT_YEARS = \[([^\]]*)\]/.exec(server)?.[1]
        expect(years, 'FIXTURE_ENDPOINT_YEARS not found in e2e/start-dev-server.mjs').toBeTruthy()

        expect(
            years,
            `start-dev-server.mjs must inject fixture endpoints for FIXTURE_YEAR (${fixtureYear}), ` +
                'or the agenda routes render their "not announced yet" state.',
        ).toContain(`'${fixtureYear}'`)
    })
})
