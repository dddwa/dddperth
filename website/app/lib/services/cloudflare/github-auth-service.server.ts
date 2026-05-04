import { Authenticator } from 'remix-auth'
import { GitHubStrategy } from 'remix-auth-github'
import type { AppConfig } from '../app-config'
import type { AuthService } from '../auth-service'
import type { User } from '../../session-types'

interface GitHubUserProfile {
    id: number
    login: string
    avatar_url: string
    name: string | null
}

// Cache one Authenticator per (clientId, webUrl) — instances are pure
// w.r.t. their config so reusing across requests is safe and faster.
const authenticatorCache = new Map<string, Authenticator<User>>()

export function createGitHubAuthService(config: AppConfig): AuthService {
    return {
        isConfigured() {
            return Boolean(config.github.oauth?.clientId && config.github.oauth?.clientSecret)
        },

        getAuthenticator() {
            const oauth = config.github.oauth
            if (!oauth) {
                throw new Error('GitHub OAuth is not configured')
            }

            const cacheKey = `${oauth.clientId}|${config.webUrl}`
            const cached = authenticatorCache.get(cacheKey)
            if (cached) return cached

            const authenticator = new Authenticator<User>()
            const gitHubStrategy = new GitHubStrategy(
                {
                    clientId: oauth.clientId,
                    clientSecret: oauth.clientSecret,
                    redirectURI: `${config.webUrl}/auth/github/callback`,
                    scopes: ['user:email'],
                },
                async ({ tokens }) => {
                    const profileResponse = await fetch('https://api.github.com/user', {
                        headers: {
                            Accept: 'application/vnd.github+json',
                            Authorization: `Bearer ${tokens.accessToken()}`,
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    })
                    const profile: GitHubUserProfile = await profileResponse.json()

                    const emailResponse = await fetch('https://api.github.com/user/emails', {
                        headers: {
                            Accept: 'application/vnd.github+json',
                            Authorization: `Bearer ${tokens.accessToken()}`,
                            'X-GitHub-Api-Version': '2022-11-28',
                        },
                    })
                    const emails: Array<{ email: string; primary: boolean }> = await emailResponse.json()
                    const primaryEmail = emails.find((email) => email.primary)?.email || null

                    return {
                        id: profile.id.toString(),
                        login: profile.login,
                        avatarUrl: profile.avatar_url,
                        name: profile.name,
                        email: primaryEmail,
                    }
                },
            )

            authenticator.use(gitHubStrategy)
            authenticatorCache.set(cacheKey, authenticator)
            return authenticator
        },
    }
}
