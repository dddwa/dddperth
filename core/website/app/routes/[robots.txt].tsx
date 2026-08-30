import { DISALLOWED_CRAWL_PATHS } from '~/lib/seo'
import type { Route } from './+types/[robots.txt]'

/**
 * robots.txt.
 *
 * Note the division of labour with the `noindex` meta tag (see `~/lib/seo`):
 * a `Disallow` here stops a crawler *fetching* a page, which means it never
 * sees that page's `noindex` tag — and a disallowed URL can still be indexed
 * from inbound links alone, listed without a description.
 *
 * So `Disallow` is reserved for auth-gated trees and APIs, where crawling is
 * pure waste (every URL redirects or returns non-HTML) and there is no risk of
 * a stray inbound link mattering. Pages a human might legitimately land on and
 * link to — `/voting`, `/auth/login` — are deliberately left crawlable so the
 * `noindex` tag can actually be read and honoured.
 */
export async function loader({ request }: Route.LoaderArgs) {
    const url = new URL(request.url)
    return new Response(
        [
            'User-agent: *',
            'Allow: /',
            ...DISALLOWED_CRAWL_PATHS.map((path) => `Disallow: ${path}`),
            '',
            `Sitemap: ${url.origin}/sitemap.xml`,
        ].join('\n'),
        {
            headers: {
                'Content-Type': 'text/plain',
            },
        },
    )
}
