export interface FrontmatterProperties {
    title?: string
    linkText?: string
    summary?: string
    draft?: boolean
    date?: string
    dateDisplay?: string

    layout?: 'with-sidebar' | 'full-width'

    /**
     * Set `noIndex: true` to keep a page out of search results and out of
     * sitemap.xml. For fixture/test pages, and any page that is published but
     * shouldn't rank.
     */
    noIndex?: boolean

    // Blog post specific
    featured?: boolean
    image?: string
    imageAlt?: string
    authors?: string[]
    /**
     * Paths this post had on a host listed in the manifest's
     * `blog.legacyHosts`, e.g. its old Medium URL path. Requests for them
     * redirect here. See `~/lib/legacy-blog-redirect.server`.
     */
    legacyPaths?: string[]
}
