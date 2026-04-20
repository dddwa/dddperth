import type { CloudflareEnv } from '../remix-app-load-context'

// Admin handles, should be lowercase
export const ADMIN_HANDLES = [
    'jakeginnivan',
    'vickiturns',
    'amykapernick',
    // Add more admin GitHub handles here
    // Example: 'john-doe', 'jane-smith'
] as const

export type AdminHandle = (typeof ADMIN_HANDLES)[number]

export function isAdminHandle(handle: string): handle is AdminHandle {
    return ADMIN_HANDLES.includes(handle.toLowerCase() as AdminHandle)
}

// Helper function to decode base64 encoded private key
export function getGitHubPrivateKey(env: CloudflareEnv): string {
    if (!env.WEBSITE_GITHUB_APP_PRIVATE_KEY) {
        throw new Error(
            'WEBSITE_GITHUB_APP_PRIVATE_KEY is not set. GitHub App access is unavailable in this environment.',
        )
    }

    try {
        // Decode base64 private key using atob (available in Workers)
        return atob(env.WEBSITE_GITHUB_APP_PRIVATE_KEY)
    } catch (error) {
        console.error('Failed to decode GitHub private key:', error)
        throw new Error(
            'Failed to decode GitHub private key. Ensure WEBSITE_GITHUB_APP_PRIVATE_KEY is a valid base64 encoded string.',
        )
    }
}

// Helper to get session secret from context
export function getSessionSecret(env: CloudflareEnv): string {
    return env.SESSION_SECRET
}

// Helper to get web URL from context
export function getWebUrl(env: CloudflareEnv): string {
    return env.WEB_URL
}

// Helper to check if we should use GitHub content
export function shouldUseGitHubContent(env: CloudflareEnv): boolean {
    return env.USE_GITHUB_CONTENT !== 'false'
}

export function isGitHubAuthConfigured(env: CloudflareEnv): boolean {
    return Boolean(env.WEBSITE_GITHUB_APP_CLIENT_ID && env.WEBSITE_GITHUB_APP_CLIENT_SECRET)
}

export function isGitHubAppConfigured(env: CloudflareEnv): boolean {
    return Boolean(
        env.WEBSITE_GITHUB_APP_ID && env.WEBSITE_GITHUB_APP_PRIVATE_KEY && env.WEBSITE_GITHUB_APP_INSTALLATION_ID,
    )
}

// Helper to get GitHub config
export function getGitHubConfig(env: CloudflareEnv) {
    return {
        organization: env.GITHUB_ORGANIZATION,
        repo: env.GITHUB_REPO,
        ref: env.GITHUB_REF ?? 'main',
        appId: env.WEBSITE_GITHUB_APP_ID,
        clientId: env.WEBSITE_GITHUB_APP_CLIENT_ID,
        clientSecret: env.WEBSITE_GITHUB_APP_CLIENT_SECRET,
        privateKey: getGitHubPrivateKey(env),
        installationId: env.WEBSITE_GITHUB_APP_INSTALLATION_ID,
    }
}
