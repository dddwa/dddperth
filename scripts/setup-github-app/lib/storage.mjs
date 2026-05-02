import { join } from 'node:path'

import { upsertDevVar } from './dev-vars.mjs'
import { putWorkerSecret } from './wrangler-secrets.mjs'

/**
 * Persist the OAuth credentials returned by the manifest exchange.
 *
 * - environment === 'local'   → writes WEBSITE_GITHUB_APP_CLIENT_ID + _SECRET into website/.dev.vars
 * - environment === 'staging' → wrangler secret put ... --env staging
 * - environment === 'production' → wrangler secret put ... --env production
 */
export async function persistCredentials({ environment, app, repoRoot }) {
    const websiteDir = join(repoRoot, 'website')

    if (environment === 'local') {
        const devVarsPath = join(websiteDir, '.dev.vars')
        upsertDevVar(devVarsPath, 'WEBSITE_GITHUB_APP_CLIENT_ID', app.client_id)
        upsertDevVar(devVarsPath, 'WEBSITE_GITHUB_APP_CLIENT_SECRET', app.client_secret)
        return { target: 'website/.dev.vars' }
    }

    if (environment !== 'staging' && environment !== 'production') {
        throw new Error(`Unknown environment: ${environment}`)
    }

    await putWorkerSecret({
        cwd: websiteDir,
        env: environment,
        key: 'WEBSITE_GITHUB_APP_CLIENT_ID',
        value: app.client_id,
    })
    await putWorkerSecret({
        cwd: websiteDir,
        env: environment,
        key: 'WEBSITE_GITHUB_APP_CLIENT_SECRET',
        value: app.client_secret,
    })

    return { target: `wrangler secrets (--env ${environment})` }
}
