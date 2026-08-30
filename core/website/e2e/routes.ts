/**
 * Shared route list for the a11y, focus-visible and visual suites.
 *
 * **Every conference-scoped route here is pinned to an explicit past year.**
 * The "current" conference is whichever year has the latest `conferenceDate`
 * in `conference/config/years-index.ts`, so unpinned `/agenda` and
 * `/sponsors` change what they render as dates pass and years are added —
 * they flip from "not announced yet" to a full agenda the moment
 * `agendaPublishedDateTime` passes. Pinned years render identically today and
 * in two years.
 *
 * Sessionize is never contacted. The worker installs a dev-only `fetch`
 * interceptor (`app/lib/sessionize-fixture-fetch.server.ts`) that answers any
 * `sessionize.com` request from `e2e/fixtures/sessionize/`. It matches on
 * hostname, so it covers every year including ones added later.
 *
 * That interception is load-bearing, and it replaced something subtler that
 * was broken: the suite previously relied on repointing the app's per-year
 * `SESSIONIZE_<YYYY>_*` endpoint overrides, but only 2026 leaves its
 * endpoints `undefined` for env injection. 2021-2025 hardcode their
 * Sessionize URLs in `conference/config/years/<year>.ts`, so there was no
 * override to set and those requests went to the live API — which meant the
 * agenda and talk-detail baselines were screenshots of live production data,
 * including a real speaker's name and photograph.
 *
 * One route per template — this list is a regression net, not an
 * exhaustive crawl. Adding a second year of the same template costs a
 * scan x2 themes plus 9 visual baselines and catches nothing new.
 *
 * Sessionize itself is never contacted: `e2e/start-dev-server.mjs` points
 * the app's endpoints at committed fixtures before the dev server boots, so
 * even the current year's agenda and the live voting flow render from
 * `e2e/fixtures/sessionize/`.
 */

export interface E2eRoute {
    name: string
    path: string
    /**
     * Optional selector to scope the *visual* baseline to. Defaults to a
     * full-page capture.
     *
     * Worth scoping for long pages, because `maxDiffPixelRatio` is a
     * **ratio**: a 10,000px-tall full-page capture absorbs several times more
     * real regression before it trips than a 2,000px one does. A sponsor grid
     * or a full-day agenda below the fold is both the least interesting part
     * of the page and the part that dilutes the tolerance most. Scoping also
     * cuts the committed baseline size substantially.
     *
     * Only affects `visual.spec.ts` — the a11y and focus-visible suites always
     * scan the whole document.
     */
    visualScope?: string
}

/**
 * The pinned fixture year. 2025 is past, so its config is frozen, and its
 * agenda now renders from the committed Sessionize fixtures rather than the
 * live API (see the note above).
 */
export const FIXTURE_YEAR = '2025'

/**
 * A session id from `e2e/fixtures/sessionize/`. The fixtures' two views
 * (GridSmart for the agenda, Sessions for talk detail) share one id space, so
 * this resolves to the same talk in both — "Fixture Talk 02", which has a
 * description and a speaker, so the detail template renders fully populated. Because the fetch interceptor answers
 * every Sessionize request from those fixtures, this resolves to synthetic
 * content and can never change under the suite.
 */
export const FIXTURE_TALK_ID = '1240238'

/** A blog slug from committed content in this repo. */
export const FIXTURE_BLOG_SLUG = '2023-02-14-chairperson-report-for-2022'

export const ROUTES: E2eRoute[] = [
    // `home` deliberately stays a full-page capture: it is the only route
    // whose baseline covers the shared header, nav and footer chrome, and a
    // good deal of the a11y work in this area lives there (skip links,
    // landmarks, nav markup). Scoping every route to `#main` would leave that
    // chrome with no visual coverage at all.
    { name: 'home', path: '/' },
    // A frozen fixture page rather than a real one (`/about` was used before):
    // an editorial copy change should not fail a visual baseline that exists to
    // cover the content *template*. It is `noIndex: true`, so it stays out of
    // search results and out of sitemap.xml.
    { name: 'content page (MDX template)', path: '/e2e-content-fixture', visualScope: '#main' },
    { name: 'agenda', path: `/agenda/${FIXTURE_YEAR}`, visualScope: '#main' },
    {
        name: 'talk detail',
        path: `/agenda/${FIXTURE_YEAR}/talk/${FIXTURE_TALK_ID}`,
        // Sponsor rendering has its own route baseline. Keep this capture on
        // the talk content so a missing time, room, abstract or speaker cannot
        // be diluted by several thousand pixels of sponsor cards below it.
        visualScope: '#talk-detail-content',
    },
    { name: 'sponsors', path: `/sponsors/${FIXTURE_YEAR}`, visualScope: '#main' },
    { name: 'blog index', path: '/blog', visualScope: '#main' },
    { name: 'blog post', path: `/blog/${FIXTURE_BLOG_SLUG}`, visualScope: '#main' },
]

/**
 * Regions masked out of every visual baseline.
 *
 * Deliberately empty. Masking paints a solid block over a region, so it only
 * makes sense for something small and genuinely volatile. It was briefly used
 * for sponsor logo grids, which turned the largest and most content-rich part
 * of `/agenda` into two big opaque rectangles — the baseline then proved
 * almost nothing about the page.
 *
 * Prefer `visualScope` (choose what to *include*) over masking (paint over
 * what to exclude). Reach for a mask only for a genuinely non-deterministic
 * element — a live clock, a random avatar — and keep it small.
 */
export const VISUAL_MASK_SELECTORS: string[] = []

/**
 * Routes that need the dev date override cookie to render their real
 * content, and therefore can't go in the shared list above (the visual and
 * structural suites don't set cookies per route). The live voting flow has
 * its own suite, `e2e/voting.spec.ts`.
 */
export const DATE_DEPENDENT_ROUTES = {
    /** The current conference's agenda, once published. Uses fixture data. */
    agendaPublished: { path: '/agenda/2026', date: '2026-09-01T10:00:00' },
    /** The live voting flow. Uses fixture data. */
    votingOpen: { path: '/voting', date: '2026-07-15T10:00:00' },
} as const
