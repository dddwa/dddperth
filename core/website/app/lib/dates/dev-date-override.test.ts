import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEV_DATE_OVERRIDE_COOKIE } from './dev-date-time-provider.server'

/**
 * Marker strings that must never reach a production bundle. Both sit behind
 * build-mode guards that Vite is expected to fold away.
 */
const DEV_ONLY_MARKERS = [
    { name: 'dev date override cookie', value: DEV_DATE_OVERRIDE_COOKIE, guard: 'load-context.server.ts' },
    // The Sessionize fixture interceptor reassigns globalThis.fetch. Shipping
    // it would let anyone who can set a Worker var silently reroute the site's
    // Sessionize traffic.
    { name: 'Sessionize fixture interceptor', value: 'SESSIONIZE_FIXTURE_URL', guard: 'workers/app.ts' },
]

/**
 * The dev date override bypasses admin auth: anyone who can set a cookie can
 * move the site's clock, which changes voting/CFP/agenda state. That is fine
 * in `vite dev` and unacceptable in production, so the guarantee it rests on
 * — Vite statically replacing `import.meta.env.MODE` with `"production"` and
 * dead-code-eliminating the branch — needs to be *tested*, not assumed.
 *
 * The production build is supplied by nx — the `test` target `dependsOn`
 * `build`, and takes that build's output as an input, so a stale `build/` can
 * neither be greped by mistake nor serve a cached pass. (Building inside the
 * test instead cost ~5s on every unit-test run; checking `existsSync` first,
 * as an earlier version did, could grep output from an entirely different
 * commit and report a false pass.) This asserts the cookie name appears
 * nowhere in that output. If someone later refactors the guard
 * into something Vite can't statically evaluate — a runtime `env` lookup, a
 * helper function, a ternary on a variable — this fails.
 */
describe('dev-only seams are absent from production builds', () => {
    const websiteRoot = join(__dirname, '..', '..', '..')
    const buildDir = join(websiteRoot, 'build')

    function collectFiles(dir: string): string[] {
        if (!existsSync(dir)) return []
        return readdirSync(dir).flatMap((entry) => {
            const full = join(dir, entry)
            return statSync(full).isDirectory() ? collectFiles(full) : [full]
        })
    }

    it.each(DEV_ONLY_MARKERS)('leaves no trace of the $name in the built worker', ({ value, guard }) => {
        const files = collectFiles(buildDir).filter((f) => f.endsWith('.js'))
        expect(
            files.length,
            'no built JS found. This test greps the production build, which is supplied by ' +
                "nx (`test` dependsOn `build`) — run it via `nx test website`, not bare `vitest run`.",
        ).toBeGreaterThan(0)

        const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(value))

        expect(
            offenders.map((f) => f.replace(websiteRoot, '')),
            `"${value}" leaked into the production build. The production-mode guard in ` +
                `${guard} must stay statically evaluable so Vite can drop the branch.`,
        ).toEqual([])
    })
})
