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

export function getSessionSecret(env: CloudflareEnv): string {
    return env.SESSION_SECRET
}

export function getWebUrl(env: CloudflareEnv): string {
    return env.WEB_URL
}

export function isGitHubAuthConfigured(env: CloudflareEnv): boolean {
    return Boolean(env.WEBSITE_GITHUB_APP_CLIENT_ID && env.WEBSITE_GITHUB_APP_CLIENT_SECRET)
}
