/**
 * Shared route list for the a11y, focus-visible and visual suites.
 *
 * **Every conference-scoped route here is pinned to an explicit past year.**
 * That is deliberate: the "current" conference is whichever year has the
 * latest `conferenceDate` in `conference/config/years-index.ts`, so the
 * unpinned `/agenda` and `/sponsors` routes change what they render as
 * config and dates move — they'd flip from "not announced yet" to a full
 * agenda the moment `agendaPublishedDateTime` passes, and again when a new
 * year is added. Pinned years render identically today and in two years,
 * with no Sessionize credentials, no date override and no network access,
 * because their agendas and sponsor lists are committed `session-data`
 * fixtures under `conference/config/years/`.
 *
 * Testing the *current* year's empty states was tried and dropped: those
 * routes are a moving target, and an empty state that silently becomes a
 * populated one turns a passing assertion into a meaningless one.
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
 * The pinned fixture year. 2025 has the richest committed agenda (multiple
 * rooms, sponsors, a full day of sessions) and, being past, its config is
 * effectively frozen.
 */
export const FIXTURE_YEAR = '2025'

/** A session id and blog slug from committed content in this repo. */
export const FIXTURE_TALK_ID = '1000132'
export const FIXTURE_BLOG_SLUG = '2023-02-14-chairperson-report-for-2022'

export const ROUTES: E2eRoute[] = [
    // `home` deliberately stays a full-page capture: it is the only route
    // whose baseline covers the shared header, nav and footer chrome, and a
    // good deal of the a11y work in this area lives there (skip links,
    // landmarks, nav markup). Scoping every route to `#main` would leave that
    // chrome with no visual coverage at all.
    { name: 'home', path: '/' },
    { name: 'about (MDX content page)', path: '/about', visualScope: '#main' },
    { name: 'agenda', path: `/agenda/${FIXTURE_YEAR}`, visualScope: '#main' },
    { name: 'talk detail', path: `/agenda/${FIXTURE_YEAR}/talk/${FIXTURE_TALK_ID}`, visualScope: '#main' },
    { name: 'sponsors', path: `/sponsors/${FIXTURE_YEAR}`, visualScope: '#main' },
    { name: 'blog index', path: '/blog', visualScope: '#main' },
    { name: 'blog post', path: `/blog/${FIXTURE_BLOG_SLUG}`, visualScope: '#main' },
]

/**
 * Regions masked out of every visual baseline.
 *
 * Sponsor logo grids are third-party artwork that changes for commercial
 * reasons rather than code reasons, and on `/agenda` they render *inside*
 * `#main` (below the schedule), so `visualScope` alone can't exclude them.
 * They are also the tallest block on several pages, which is what dilutes
 * `maxDiffPixelRatio` most.
 *
 * Masking rather than hiding is deliberate: `display: none` would reflow
 * everything below it, so the baseline would stop reflecting the real page.
 * A mask paints over the region and leaves layout untouched.
 *
 * The trade-off is explicit: sponsor *layout* still counts (the box occupies
 * its real space), sponsor *artwork* no longer does.
 */
export const VISUAL_MASK_SELECTORS = ['[data-sponsor-grid]']

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
