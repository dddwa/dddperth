import { createCookieSessionStorage } from 'react-router'
import type { AppConfig } from '../app-config'
import type { SessionStorages } from '../session-storages'
import type { AdminDateTimeSessionData, AuthSessionData, VotingStorageData } from '../../session-types'

// Cache per-secret. Cookie session storage instances are heap objects with
// no backend, so reusing them across requests with the same secret is safe.
const cache = new Map<string, SessionStorages>()

export function createCookieSessionStorages(config: AppConfig): SessionStorages {
    const cached = cache.get(config.sessionSecret)
    if (cached) return cached

    const storages: SessionStorages = {
        auth: createCookieSessionStorage<AuthSessionData>({
            cookie: {
                name: '__auth',
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secrets: [config.sessionSecret],
                secure: true,
            },
        }),
        voting: createCookieSessionStorage<VotingStorageData>({
            cookie: {
                name: '__voting',
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secrets: [config.sessionSecret],
                secure: true,
                maxAge: 60 * 60 * 24 * 7,
            },
        }),
        adminDateTime: createCookieSessionStorage<AdminDateTimeSessionData>({
            cookie: {
                name: '__adminDateTime',
                httpOnly: true,
                path: '/',
                sameSite: 'lax',
                secrets: [config.sessionSecret],
                secure: true,
            },
        }),
    }

    cache.set(config.sessionSecret, storages)
    return storages
}
