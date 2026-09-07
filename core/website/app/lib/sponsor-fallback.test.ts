import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FIXTURE_SPONSOR_NAME, FIXTURE_SPONSORS } from '../../e2e/fixtures/sponsors'
import { resolveSponsorsWithFallback } from './sponsor-fallback.server'

const realSponsors = {
    platinum: [{ name: 'Real Sponsor', website: '', logoUrlDarkMode: '', logoUrlLightMode: '' }],
}

describe('resolveSponsorsWithFallback', () => {
    it('uses the current year when it has sponsors', () => {
        const resolved = resolveSponsorsWithFallback('2026', realSponsors)

        expect(resolved.kind).toBe('current')
        expect(resolved.kind !== 'empty' && resolved.sponsors).toEqual(realSponsors)
    })

    /**
     * The fallback is what the site shows for the months between announcing a
     * conference and signing its first sponsor. Pinning `/` to fixtures means
     * its baseline always renders the `current` state, so this is the only
     * coverage the fallback has.
     */
    it('falls back to a prior year when the current one has no sponsors', () => {
        // A far-future year has no config of its own, so this exercises the
        // fallback without depending on which years are currently signed.
        const resolved = resolveSponsorsWithFallback('2099', undefined)

        expect(resolved.kind).toBe('fallback')
        if (resolved.kind === 'fallback') {
            expect(Number(resolved.year)).toBeLessThan(2099)
            expect(Object.values(resolved.sponsors).some((tier) => tier && tier.length > 0)).toBe(true)
        }
    })
})

/**
 * The fixture seam pins the home page's sponsor strip for the visual suite.
 *
 * Its first implementation kept the flag in module-level state set from
 * `load-context.server.ts`. That failed silently: Vite splits load-context
 * into its own SSR chunk, so the resolver read a different instance of the
 * module, the flag was never seen, and the suite reported "72 passed" while
 * the fixtures never applied. The flag now travels on `AppConfig` — plain
 * per-request data, no cross-chunk state — and `visual.spec.ts` asserts a
 * fixture logo is actually on the page.
 */
describe('sponsor fixtures', () => {
    it('replaces the real sponsor list when enabled', () => {
        const resolved = resolveSponsorsWithFallback('2026', realSponsors, true)

        expect(resolved.kind).toBe('current')
        expect(resolved.kind !== 'empty' && resolved.sponsors).toEqual(FIXTURE_SPONSORS)
    })

    it('is off by default, so real sponsors render on the live site', () => {
        const resolved = resolveSponsorsWithFallback('2026', realSponsors)

        expect(resolved.kind !== 'empty' && resolved.sponsors).toEqual(realSponsors)
    })

    /**
     * The strip renders platinum and gold and nothing else, so fixtures for any
     * other tier would be invisible — a silent no-op for whoever added them.
     */
    it('only populates the tiers the hero strip renders', () => {
        expect(Object.keys(FIXTURE_SPONSORS).sort()).toEqual(['gold', 'platinum'])
        expect(FIXTURE_SPONSORS.platinum?.length).toBeGreaterThan(0)
        expect(FIXTURE_SPONSORS.gold?.length).toBeGreaterThan(0)
    })

    /** The name `visual.spec.ts` asserts on has to exist in the data. */
    it('exposes a fixture sponsor name the visual suite can assert on', () => {
        const names = [...(FIXTURE_SPONSORS.platinum ?? []), ...(FIXTURE_SPONSORS.gold ?? [])].map((s) => s.name)
        expect(names).toContain(FIXTURE_SPONSOR_NAME)
    })

    /**
     * Logos are inlined as data URIs precisely so they never reach the client
     * build — everything under `public/` is copied there verbatim, and an
     * earlier version of this seam did ship its logos.
     */
    it('inlines logos rather than referencing shippable asset files', () => {
        const logos = [...(FIXTURE_SPONSORS.platinum ?? []), ...(FIXTURE_SPONSORS.gold ?? [])].flatMap((s) => [
            s.logoUrlDarkMode,
            s.logoUrlLightMode,
        ])

        expect(logos.length).toBeGreaterThan(0)
        for (const logo of logos) {
            expect(logo, 'fixture logos must be inline data URIs, not files under public/').toMatch(
                /^data:image\/svg\+xml,/,
            )
        }
    })

    /**
     * `start-dev-server.mjs` sets the env var and `build-config.server.ts`
     * reads it. They are in different languages with no shared import, so a
     * rename on one side would silently stop pinning the strip.
     */
    it('keeps the env var name in sync between the server wrapper and the config builder', () => {
        const websiteRoot = join(__dirname, '..', '..')
        const server = readFileSync(join(websiteRoot, 'e2e', 'start-dev-server.mjs'), 'utf8')
        const config = readFileSync(
            join(websiteRoot, 'app', 'lib', 'services', 'cloudflare', 'build-config.server.ts'),
            'utf8',
        )

        expect(server, 'e2e/start-dev-server.mjs must set E2E_SPONSOR_FIXTURES').toContain('E2E_SPONSOR_FIXTURES=true')
        expect(config, 'build-config.server.ts must read E2E_SPONSOR_FIXTURES').toContain(
            "env.E2E_SPONSOR_FIXTURES === 'true'",
        )
    })
})
