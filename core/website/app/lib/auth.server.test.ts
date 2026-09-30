import { describe, expect, it } from 'vitest'
import { requireAdmin } from './auth.server'
import type { AppServices } from './services/app-services'
import { servicesContext } from '~/remix-app-load-context'

interface Roles {
    admin?: boolean
    sponsor?: boolean
    speaker?: boolean
}

function contextFor(roles: Roles) {
    const services = {
        sessions: { auth: { getSession: async () => ({ get: () => 'session-id' }) } },
        auth: {
            getSessionUser: async () => ({ email: 'someone@example.test', name: null }),
            touchSession: async () => {},
            isAdminEmail: async () => roles.admin ?? false,
        },
        sponsors: { isSponsorContact: async () => roles.sponsor ?? false },
        speakers: { isSpeakerContact: async () => roles.speaker ?? false },
    } as unknown as AppServices

    return {
        get<T>(key: unknown): T {
            if (key !== servicesContext) throw new Error('unexpected context key')
            return services as T
        },
    }
}

async function thrownBy(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise
    } catch (error) {
        return error
    }
    throw new Error('expected requireAdmin to throw')
}

const request = new Request('https://example.test/admin')

describe('requireAdmin', () => {
    it('lets an admin through', async () => {
        await expect(requireAdmin(request, contextFor({ admin: true }))).resolves.toMatchObject({
            email: 'someone@example.test',
        })
    })

    it('sends a sponsor contact to the sponsor portal', async () => {
        const thrown = await thrownBy(requireAdmin(request, contextFor({ sponsor: true })))
        expect((thrown as Response).headers.get('Location')).toBe('/portal')
    })

    it('sends a speaker to the speaker portal', async () => {
        const thrown = await thrownBy(requireAdmin(request, contextFor({ speaker: true })))
        expect((thrown as Response).headers.get('Location')).toBe('/speaker-portal')
    })

    it('answers a session with no role in the admin area, not the sponsor portal', async () => {
        // Seen in production: an admin whose allowlist row had gone missing
        // was redirected to /portal and told their email "isn't linked to a
        // sponsor" — true, but nothing to do with what they asked for.
        const thrown = await thrownBy(requireAdmin(request, contextFor({})))

        expect(thrown).toMatchObject({
            data: { reason: 'not-an-admin', email: 'someone@example.test' },
            init: { status: 403 },
        })
    })
})
