import { createCookieSessionStorage } from 'react-router'
import { SESSION_SECRET } from './config.server'

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

export const authSessionStorage = createCookieSessionStorage<AuthSessionData>({
    cookie: {
        name: '__auth',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets: [SESSION_SECRET],
        secure: process.env.NODE_ENV === 'production',
    },
})

export const votingStorage = createCookieSessionStorage<VotingStorageData>({
    cookie: {
        name: '__voting',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets: [SESSION_SECRET],
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    },
})

export const adminDateTimeSessionStorage = createCookieSessionStorage<AdminDateTimeSessionData>({
    cookie: {
        name: '__adminDateTime',
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        secrets: [SESSION_SECRET],
        secure: process.env.NODE_ENV === 'production',
    },
})
