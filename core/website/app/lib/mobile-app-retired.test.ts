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
                retired: {},
            }
        })

        it('still serves /app-config, because installed copies depend on it', async () => {
            const loader = await loadAppConfig()
            const response = await loader({ context: ctx } as never)

            expect(response.status).toBe(200)
        })

        it('includes a notice pointing at the website', async () => {
            const loader = await loadAppConfig()
            const response = await loader({ context: ctx } as never)
            const body = JSON.parse(await response.text())

            expect(body.notice.url).toBe('https://testconf.example')
            expect(body.notice.message).toContain('testconf.example')
            // States what happened (no 2026 updates) rather than claiming the
            // app is broken or unsupported — the data it shows is live.
            expect(body.notice.message).toContain('should still work')
            // Year comes from conference state, so it tracks forward on its own.
            expect(body.notice.message).toContain('2026')
        })

        it('keeps serving the rest of the config alongside the notice', async () => {
            const loader = await loadAppConfig()
            const response = await loader({ context: ctx } as never)
            const body = JSON.parse(await response.text())

            expect(body.conferenceDate).toBe('2026-09-19')
            expect(body.v2.support).toBe('https://testconf.example/app-content/conference-day')
        })

        it('404s /app, so the website stops advertising the app', async () => {
            const loader = await loadAppPage()

            expect(() => loader()).toThrowError(expect.objectContaining({ status: 404 }))
        })

        it('prefers an explicit notice over the generated one', async () => {
            manifestMock.conferenceManifest.mobileApp = {
                ...maintained,
                retired: { notice: 'Custom copy.' },
            }
            const loader = await loadAppConfig()
            const body = JSON.parse(await (await loader({ context: ctx } as never)).text())

            expect(body.notice.message).toBe('Custom copy.')
        })
    })

    describe('when the app is maintained', () => {
        beforeEach(() => {
            manifestMock.conferenceManifest.mobileApp = { ...maintained }
        })

        it('omits the notice entirely, so older builds are unaffected', async () => {
            const loader = await loadAppConfig()
            const body = JSON.parse(await (await loader({ context: ctx } as never)).text())

            expect(body).not.toHaveProperty('notice')
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
