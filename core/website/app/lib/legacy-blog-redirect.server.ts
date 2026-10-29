import { conferenceManifest } from '@conference/manifest'
import bundles from 'virtual:mdx-bundles'
import type { FrontmatterProperties } from './mdx-types'

/**
 * The hostname a request was addressed to. A CDN or proxy in front of the
 * Worker can rewrite `Host` to the origin it forwards to, and records the
 * original in `X-Forwarded-Host` or the standard `Forwarded` header — so those
 * win. Spoofing them only buys a redirect to this same site.
 */
export function getRequestHostname(request: Request): string {
    const forwardedHost = request.headers.get('X-Forwarded-Host')?.split(',')[0]
    const forwarded = request.headers
        .get('Forwarded')
        ?.split(',')[0]
        ?.match(/(?:^|;)\s*host="?([^";]+)"?/i)?.[1]
    const host = forwardedHost || forwarded || request.headers.get('Host') || new URL(request.url).host
    return host.trim().toLowerCase().replace(/:\d+$/, '')
}

function normalisePath(pathname: string) {
    let decoded = pathname
    try {
        decoded = decodeURIComponent(pathname)
    } catch {
        // Malformed escapes can't match a legacy path; compare them as-is.
    }
    return decoded.replace(/\/+$/, '') || '/'
}

/**
 * Permanent redirect for a request to one of the blog's old hosts, or `null`
 * when the request isn't for one. Always redirects to an absolute URL on the
 * canonical domain: a relative `Location` would resolve against the legacy
 * host and come straight back here.
 */
export function getLegacyBlogRedirect(
    request: Request,
    {
        legacyHosts,
        canonicalOrigin,
        slugByLegacyPath,
    }: { legacyHosts: string[]; canonicalOrigin: string; slugByLegacyPath: Map<string, string> },
): Response | null {
    if (!legacyHosts.length) return null
    if (!legacyHosts.map((h) => h.toLowerCase()).includes(getRequestHostname(request))) return null

    const slug = slugByLegacyPath.get(normalisePath(new URL(request.url).pathname))
    const target = new URL(slug ? `/blog/${slug}` : '/blog', canonicalOrigin)
    return Response.redirect(target.toString(), 301)
}

let slugByLegacyPath: Map<string, string> | undefined

function getSlugByLegacyPath() {
    slugByLegacyPath ??= new Map(
        Object.entries(bundles.blog).flatMap(([slug, entry]) =>
            ((entry.frontmatter as FrontmatterProperties).legacyPaths ?? []).map(
                (legacyPath) => [normalisePath(legacyPath), slug] as const,
            ),
        ),
    )
    return slugByLegacyPath
}

export function getConferenceLegacyBlogRedirect(request: Request): Response | null {
    const legacyHosts = conferenceManifest.blog?.legacyHosts ?? []
    if (!legacyHosts.length) return null
    return getLegacyBlogRedirect(request, {
        legacyHosts,
        canonicalOrigin: `https://${conferenceManifest.brand.domain}`,
        slugByLegacyPath: getSlugByLegacyPath(),
    })
}
