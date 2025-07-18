import { redirect } from 'react-router'
import { Authenticator } from 'remix-auth'
import { GitHubStrategy } from 'remix-auth-github'
import { WEBSITE_GITHUB_APP_CLIENT_ID, WEBSITE_GITHUB_APP_CLIENT_SECRET, WEB_URL, isAdminHandle } from './config.server'
import type { User } from './session.server'
import { authSessionStorage } from './session.server'

// Create an instance of the authenticator
export const authenticator = new Authenticator<User>()

// GitHub OAuth configuration (works with GitHub Apps too)
const gitHubStrategy = new GitHubStrategy(
    {
        clientId: WEBSITE_GITHUB_APP_CLIENT_ID,
        clientSecret: WEBSITE_GITHUB_APP_CLIENT_SECRET,
        redirectURI: `${WEB_URL}/auth/github/callback`,
        scopes: ['user:email'],
    },
    async ({ tokens, request }) => {
        // Get user profile from GitHub API
        const profileResponse = await fetch('https://api.github.com/user', {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${tokens.accessToken()}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        })

        const profile = await profileResponse.json()

        // Get user email from GitHub API
        const emailResponse = await fetch('https://api.github.com/user/emails', {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `Bearer ${tokens.accessToken()}`,
                'X-GitHub-Api-Version': '2022-11-28',
            },
        })

        const emails: Array<{ email: string; primary: boolean }> = await emailResponse.json()
        const primaryEmail = emails.find((email) => email.primary)?.email || null

        // Return user data
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

export function isAdmin(user: User | null): boolean {
    if (!user) return false
    return isAdminHandle(user.login)
}

export async function requireAdmin(request: Request): Promise<User> {
    const session = await authSessionStorage.getSession(request.headers.get('cookie'))
    const user = session.get('user')

    if (!user) {
        throw redirect('/auth/login')
    }

    if (!isAdmin(user)) {
        throw new Response('Forbidden', { status: 403 })
    }

    return user
}

export async function getUser(requestHeaders: Headers): Promise<User | null> {
    const session = await authSessionStorage.getSession(requestHeaders.get('cookie'))
    return session.get('user') as User | null
}

export async function createUserSession(requestHeaders: Headers, user: User, redirectTo: string) {
    const session = await authSessionStorage.getSession(requestHeaders.get('cookie'))
    session.set('user', user)
    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await authSessionStorage.commitSession(session),
        },
    })
}

export async function logout(requestHeaders: Headers, redirectTo = '/') {
    const session = await authSessionStorage.getSession(requestHeaders.get('cookie'))
    return redirect(redirectTo, {
        headers: {
            'Set-Cookie': await authSessionStorage.commitSession(session),
        },
    })
}
