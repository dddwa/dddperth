/**
 * Shared SEO helpers.
 *
 * `noIndexMeta()` marks a route as off-limits to search engines. Use it for
 * anything that shouldn't appear in results: authenticated areas, transient
 * flows, and test-only pages.
 *
 * Two things worth knowing about how this interacts with the rest of the site:
 *
 * 1. **A child route's `meta` replaces its parent's entirely** in React Router
 *    — it does not merge. So a route exporting `meta: noIndexMeta` drops the
 *    root layout's title/description/OG tags along with picking up `noindex`.
 *    For private pages that's the right trade (there is nothing to share), but
 *    if a page needs both, spread the tags: `[...noIndexMeta(), { title }]`.
 *
 * 2. **`noindex` and `robots.txt` do different jobs, and one can defeat the
 *    other.** A `Disallow` in robots.txt stops a crawler *fetching* the page —
 *    which means it never sees the `noindex` tag, and the URL can still be
 *    indexed from inbound links alone (listed without a description). So for
 *    pages we actively want removed from an index, prefer the meta tag and
 *    leave them crawlable. Reserve robots.txt `Disallow` for areas where the
 *    crawl itself is the problem (large auth-gated trees that just waste
 *    crawl budget and redirect anyway).
 */

/** A meta descriptor list telling crawlers not to index or follow this page. */
export function noIndexMeta() {
    return [
        // `noindex` keeps it out of results; `nofollow` stops link equity
        // flowing onward from pages that are usually behind auth anyway.
        { name: 'robots', content: 'noindex, nofollow' },
        // Googlebot honours the generic `robots` directive, but an explicit
        // googlebot tag is a cheap belt-and-braces for the one crawler that
        // matters most here.
        { name: 'googlebot', content: 'noindex, nofollow' },
    ]
}

/**
 * Path prefixes that should never be crawled, used to build `robots.txt`.
 *
 * Deliberately short: these are auth-gated trees where a crawl is pure waste
 * (every URL redirects to login) and API endpoints that return no HTML. Pages
 * a human might legitimately land on — `/voting`, `/auth/login` — are left
 * crawlable *on purpose* so crawlers can actually read their `noindex` tag.
 */
export const DISALLOWED_CRAWL_PATHS = ['/admin', '/portal', '/speaker-portal', '/api/']
