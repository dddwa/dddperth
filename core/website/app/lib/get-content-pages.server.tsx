import bundles from 'virtual:mdx-bundles'
import type { FrontmatterProperties } from './mdx-types'

/**
 * List of content pages for the sitemap.
 *
 * Two exclusions:
 *  - Underscore-prefixed slugs (`_home-hero`, `_acknowledgement`) are MDX
 *    fragments embedded in other pages, not navigable pages of their own.
 *  - `noIndex: true` in frontmatter. Listing a page in the sitemap while its
 *    own meta says `noindex` sends crawlers a contradiction, so the flag has
 *    to be honoured in both places — see `~/lib/seo`.
 */
export function getContentPages() {
    const today = new Date().toISOString().split('T')[0]
    return Object.entries(bundles.page)
        .filter(([slug]) => !slug.startsWith('_'))
        .filter(([, entry]) => !(entry.frontmatter as FrontmatterProperties | undefined)?.noIndex)
        .map(([slug]) => ({
            path: `/${slug}`,
            lastmod: today,
            changefreq: 'monthly',
            priority: 0.7,
        }))
}
