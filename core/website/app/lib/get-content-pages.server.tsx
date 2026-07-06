import bundles from 'virtual:mdx-bundles'

/**
 * List of content pages for the sitemap. Filters out underscore-prefixed
 * slugs (e.g. `_home-hero`, `_acknowledgement`) which are MDX fragments
 * embedded in other pages rather than navigable pages of their own.
 */
export function getContentPages() {
    const today = new Date().toISOString().split('T')[0]
    return Object.keys(bundles.page)
        .filter((slug) => !slug.startsWith('_'))
        .map((slug) => ({
            path: `/${slug}`,
            lastmod: today,
            changefreq: 'monthly',
            priority: 0.7,
        }))
}
