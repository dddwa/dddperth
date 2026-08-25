import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEV_DATE_OVERRIDE_COOKIE } from './dev-date-time-provider.server'

/**
 * Marker strings that must never reach a production bundle. Both sit behind
 * `import.meta.env.DEV` guards that Vite is expected to fold away.
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
 * — Vite statically replacing `import.meta.env.DEV` with `false` and
 * dead-code-eliminating the branch — needs to be *tested*, not assumed.
 *
 * This builds the worker (if it isn't already built) and asserts the cookie
 * name appears nowhere in the output. If someone later refactors the guard
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
        if (!existsSync(join(buildDir, 'server'))) {
            execFileSync('pnpm', ['exec', 'react-router', 'build'], {
                cwd: websiteRoot,
                stdio: 'inherit',
            })
        }

        const files = collectFiles(buildDir).filter((f) => f.endsWith('.js'))
        expect(files.length, 'no built JS found — did the build succeed?').toBeGreaterThan(0)

        const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(value))

        expect(
            offenders.map((f) => f.replace(websiteRoot, '')),
            `"${value}" leaked into the production build. The import.meta.env.DEV guard in ` +
                `${guard} must stay statically evaluable so Vite can drop the branch.`,
        ).toEqual([])
    })
})
