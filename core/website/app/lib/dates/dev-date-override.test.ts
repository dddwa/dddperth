import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEV_DATE_OVERRIDE_COOKIE } from './dev-date-time-provider.server'

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
describe('dev date override is absent from production builds', () => {
    const websiteRoot = join(__dirname, '..', '..', '..')
    const buildDir = join(websiteRoot, 'build')

    function collectFiles(dir: string): string[] {
        if (!existsSync(dir)) return []
        return readdirSync(dir).flatMap((entry) => {
            const full = join(dir, entry)
            return statSync(full).isDirectory() ? collectFiles(full) : [full]
        })
    }

    it('leaves no trace of the override cookie in the built worker', () => {
        if (!existsSync(join(buildDir, 'server'))) {
            execFileSync('pnpm', ['exec', 'react-router', 'build'], {
                cwd: websiteRoot,
                stdio: 'inherit',
            })
        }

        const files = collectFiles(buildDir).filter((f) => f.endsWith('.js'))
        expect(files.length, 'no built JS found — did the build succeed?').toBeGreaterThan(0)

        const offenders = files.filter((file) => readFileSync(file, 'utf8').includes(DEV_DATE_OVERRIDE_COOKIE))

        expect(
            offenders.map((f) => f.replace(websiteRoot, '')),
            `"${DEV_DATE_OVERRIDE_COOKIE}" leaked into the production build. The import.meta.env.DEV ` +
                'guard in load-context.server.ts must stay statically evaluable so Vite can drop the branch.',
        ).toEqual([])
    })
})
