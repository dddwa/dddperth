import { expect, test } from '@playwright/test'

/**
 * Search-engine indexing rules.
 *
 * Two failure modes are worth guarding, and they pull in opposite directions:
 * a private page silently becoming indexable, and a public page silently
 * becoming *un*indexable — the second is the more damaging of the two and the
 * easier to cause by accident, because a child route's `meta` replaces its
 * parent's wholesale in React Router.
 */

/** Pages that must never appear in search results. */
const NO_INDEX_ROUTES = [
    { name: 'voting', path: '/voting' },
    { name: 'login', path: '/auth/login' },
    { name: 'admin', path: '/admin' },
    { name: 'sponsor portal', path: '/portal' },
    { name: 'speaker portal', path: '/speaker-portal' },
    { name: 'share', path: '/share' },
    { name: 'content fixture page', path: '/e2e-content-fixture' },
]

/** Pages that must stay indexable — the site's actual search surface. */
const INDEXABLE_ROUTES = [
    { name: 'home', path: '/' },
    { name: 'agenda', path: '/agenda/2025' },
    { name: 'blog index', path: '/blog' },
    { name: 'about', path: '/about' },
]

for (const route of NO_INDEX_ROUTES) {
    test(`${route.name} (${route.path}) is marked noindex`, async ({ page }) => {
        await page.goto(route.path)
        // Auth-gated routes redirect to login, which is itself noindex — so
        // this asserts the rendered page either way, not the URL.
        const robots = page.locator('meta[name="robots"]')
        await expect(robots).toHaveAttribute('content', /noindex/)
    })
}

for (const route of INDEXABLE_ROUTES) {
    test(`${route.name} (${route.path}) stays indexable`, async ({ page }) => {
        await page.goto(route.path)
        const robots = page.locator('meta[name="robots"]')
        // A missing robots tag means "index" by default, which is fine. Only an
        // explicit noindex is a failure.
        const count = await robots.count()
        if (count > 0) {
            await expect(robots.first()).not.toHaveAttribute('content', /noindex/)
        }
    })
}

test('robots.txt disallows the auth-gated trees and points at the sitemap', async ({ request }) => {
    const body = await (await request.get('/robots.txt')).text()

    for (const path of ['/admin', '/portal', '/speaker-portal', '/api/']) {
        expect(body, `robots.txt should disallow ${path}`).toContain(`Disallow: ${path}`)
    }
    expect(body).toContain('Sitemap:')

    // /voting is deliberately NOT disallowed: a crawler has to fetch a page to
    // see its noindex tag, so blocking the crawl would leave the URL indexable
    // from inbound links alone, listed without a description.
    expect(body).not.toContain('Disallow: /voting')
})

test('sitemap.xml lists public pages and omits noIndex ones', async ({ request }) => {
    const body = await (await request.get('/sitemap.xml')).text()

    expect(body).toContain('/about')
    expect(body, 'a noIndex page must not be advertised in the sitemap').not.toContain('e2e-content-fixture')
    for (const path of ['/admin', '/portal', '/speaker-portal']) {
        expect(body, `${path} must not be in the sitemap`).not.toContain(`<loc>${path}`)
    }
})
