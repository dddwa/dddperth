import { createCookieSessionStorage } from 'react-router'

export interface User {
    id: string
    login: string
    avatarUrl: string
    name: string | null
    email: string | null
}

export interface AuthSessionData {
    user?: User
}

export type SessionId = string

export interface VotingStorageData {
    sessionId?: SessionId
}

export interface AdminDateTimeSessionData {
    adminDateOverride?: string
}

// Session secret - in Cloudflare Workers, this will be set via env binding
// For development, use a default secret
const getSessionSecret = () => {
    // In Cloudflare Workers, the secret should be set via wrangler secret
    // This fallback is for local development only
    return 'development-secret-change-in-production'
}

// Lazy-initialized session storages
let _authSessionStorage: ReturnType<typeof createCookieSessionStorage<AuthSessionData>> | null = null
let _votingStorage: ReturnType<typeof createCookieSessionStorage<VotingStorageData>> | null = null
let _adminDateTimeSessionStorage: ReturnType<typeof createCookieSessionStorage<AdminDateTimeSessionData>> | null = null

export const authSessionStorage = {
    getSession: (cookie: string | null) => {
        if (!_authSessionStorage) {
            _authSessionStorage = createCookieSessionStorage<AuthSessionData>({
                cookie: {
                    name: '__auth',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _authSessionStorage.getSession(cookie)
    },
    commitSession: (session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<AuthSessionData>>['getSession']>>) => {
        if (!_authSessionStorage) {
            _authSessionStorage = createCookieSessionStorage<AuthSessionData>({
                cookie: {
                    name: '__auth',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _authSessionStorage.commitSession(session)
    },
    destroySession: (
        session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<AuthSessionData>>['getSession']>>,
    ) => {
        if (!_authSessionStorage) {
            _authSessionStorage = createCookieSessionStorage<AuthSessionData>({
                cookie: {
                    name: '__auth',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _authSessionStorage.destroySession(session)
    },
}

export const votingStorage = {
    getSession: (cookie: string | null) => {
        if (!_votingStorage) {
            _votingStorage = createCookieSessionStorage<VotingStorageData>({
                cookie: {
                    name: '__voting',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                    maxAge: 60 * 60 * 24 * 7, // 7 days
                },
            })
        }
        return _votingStorage.getSession(cookie)
    },
    commitSession: (session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<VotingStorageData>>['getSession']>>) => {
        if (!_votingStorage) {
            _votingStorage = createCookieSessionStorage<VotingStorageData>({
                cookie: {
                    name: '__voting',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                    maxAge: 60 * 60 * 24 * 7,
                },
            })
        }
        return _votingStorage.commitSession(session)
    },
    destroySession: (
        session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<VotingStorageData>>['getSession']>>,
    ) => {
        if (!_votingStorage) {
            _votingStorage = createCookieSessionStorage<VotingStorageData>({
                cookie: {
                    name: '__voting',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                    maxAge: 60 * 60 * 24 * 7,
                },
            })
        }
        return _votingStorage.destroySession(session)
    },
}

export const adminDateTimeSessionStorage = {
    getSession: (cookie: string | null) => {
        if (!_adminDateTimeSessionStorage) {
            _adminDateTimeSessionStorage = createCookieSessionStorage<AdminDateTimeSessionData>({
                cookie: {
                    name: '__adminDateTime',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _adminDateTimeSessionStorage.getSession(cookie)
    },
    commitSession: (
        session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<AdminDateTimeSessionData>>['getSession']>>,
    ) => {
        if (!_adminDateTimeSessionStorage) {
            _adminDateTimeSessionStorage = createCookieSessionStorage<AdminDateTimeSessionData>({
                cookie: {
                    name: '__adminDateTime',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _adminDateTimeSessionStorage.commitSession(session)
    },
    destroySession: (
        session: Awaited<ReturnType<ReturnType<typeof createCookieSessionStorage<AdminDateTimeSessionData>>['getSession']>>,
    ) => {
        if (!_adminDateTimeSessionStorage) {
            _adminDateTimeSessionStorage = createCookieSessionStorage<AdminDateTimeSessionData>({
                cookie: {
                    name: '__adminDateTime',
                    httpOnly: true,
                    path: '/',
                    sameSite: 'lax',
                    secrets: [getSessionSecret()],
                    secure: true,
                },
            })
        }
        return _adminDateTimeSessionStorage.destroySession(session)
    },
}
