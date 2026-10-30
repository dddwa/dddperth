import { describe, expect, it } from 'vitest'
import type { CloudflareEnv } from '../../../remix-app-load-context'
import { buildAppConfigFromEnv } from './build-config.server'
import { createCookieSessionStorages } from './cookie-session-storages.server'

const envWith = (vars: Partial<CloudflareEnv>) => ({ WEB_URL: 'http://localhost:3800', ...vars }) as CloudflareEnv

describe('session secret outside production', () => {
    it('lets a session be committed in a checkout with no SESSION_SECRET', async () => {
        // A fresh worktree has no `.dev.vars`. Before the fallback, this threw
        // "Imported HMAC key length (0) must be a non-zero value" on every
        // magic-link login. The production side of the guarantee — that the
        // fallback is not in the built worker — is `dev-date-override.test.ts`.
        const { auth } = createCookieSessionStorages(buildAppConfigFromEnv(envWith({})))
        const session = await auth.getSession()
        session.set('sessionId', 'local-session')

        await expect(auth.commitSession(session)).resolves.toContain('__auth=')
    })

    it('uses SESSION_SECRET when it is set', () => {
        expect(buildAppConfigFromEnv(envWith({ SESSION_SECRET: 'from-dev-vars' })).sessionSecret).toBe('from-dev-vars')
    })
})
