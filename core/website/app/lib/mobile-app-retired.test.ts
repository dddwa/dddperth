/**
 * The retired-app contract, which is easy to break by tidying.
 *
 * `/app` and `/app-config` used to share one presence check on
 * `manifest.mobileApp`, and collapsing them back into one would look like a
 * harmless simplification. It isn't: a retired app still has copies
 * installed on people's phones that poll /app-config on launch, so the two
 * routes have to disagree — /app 404s, /app-config keeps answering.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const manifestMock = vi.hoisted(() => ({
    conferenceManifest: {
        public: { name: 'Test Conf' },
        brand: { domain: 'testconf.example', githubOrg: 'testorg' },
        mobileApp: undefined as undefined | Record<string, unknown>,
    },
}))

vi.mock('@conference/manifest', () => manifestMock)

const conferenceState = {
    conference: { date: '2026-09-19', sponsors: {}, year: '2026' },
}

vi.mock('~/remix-app-load-context', () => ({
    getConferenceState: () => conferenceState,
    getServices: () => ({}),
}))

const loadAppConfig = async () => {
    vi.resetModules()
    return (await import('../routes/app-config')).loader
}

const loadAppPage = async () => {
    vi.resetModules()
    return (await import('../routes/_layout.app')).loader
}

// The loaders only read `context` through the mocked getConferenceState.
const ctx = {} as never

const maintained = {
    iosUrl: 'https://apps.apple.com/au/app/test/id1',
    androidUrl: 'https://play.google.com/store/apps/details?id=com.test',
}

describe('mobile app retirement', () => {
    beforeEach(() => {
        manifestMock.conferenceManifest.mobileApp = undefined
    })

    describe('when the app is retired', () => {
        beforeEach(() => {
            manifestMock.conferenceManifest.mobileApp = {
                ...maintained,
                retired: true,
            }
        })

        it('still serves /app-config, because installed copies depend on it', async () => {
            const loader = await loadAppConfig()
            const response = loader({ context: ctx } as never)

            expect(response.status).toBe(200)
        })

        it('serves the full config, unchanged', async () => {
            const loader = await loadAppConfig()
            const response = loader({ context: ctx } as never)
            const body = JSON.parse(await response.text())

            expect(body.conferenceDate).toBe('2026-09-19')
            expect(body.v2.support).toBe('https://testconf.example/app-content/conference-day')
        })

        it('404s /app, so the website stops advertising the app', async () => {
            const loader = await loadAppPage()

            expect(() => loader()).toThrowError(expect.objectContaining({ status: 404 }))
        })

        // Retiring must not alter the payload at all. Anything a fork wants
        // to say to the remaining users goes through /app-announcements,
        // which the installed builds already know how to render.
        it('serves a payload byte-identical to a maintained app', async () => {
            const retiredBody = await loadAppConfig().then((l) => l({ context: ctx } as never).text())

            manifestMock.conferenceManifest.mobileApp = { ...maintained }
            const maintainedBody = await loadAppConfig().then((l) => l({ context: ctx } as never).text())

            expect(retiredBody).toBe(maintainedBody)
        })
    })

    describe('when the app is maintained', () => {
        beforeEach(() => {
            manifestMock.conferenceManifest.mobileApp = { ...maintained }
        })

        it('renders /app', async () => {
            const loader = await loadAppPage()

            expect(loader()).toEqual({ iosUrl: maintained.iosUrl, androidUrl: maintained.androidUrl })
        })
    })

    describe('when the fork has no app at all', () => {
        it('404s both routes', async () => {
            const appConfig = await loadAppConfig()
            expect(() => appConfig({ context: ctx } as never)).toThrowError(expect.objectContaining({ status: 404 }))

            const appPage = await loadAppPage()
            expect(() => appPage()).toThrowError(expect.objectContaining({ status: 404 }))
        })
    })
})
