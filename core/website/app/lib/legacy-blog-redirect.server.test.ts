import { describe, expect, it, vi } from 'vitest'

vi.mock('virtual:mdx-bundles', () => ({ default: { page: {}, blog: {} } }))

const { getLegacyBlogRedirect, getRequestHostname } = await import('./legacy-blog-redirect.server')

const options = {
    legacyHosts: ['blog.example.com'],
    canonicalOrigin: 'https://example.com',
    slugByLegacyPath: new Map([['/agm-announcement-8e0648b7d173', '2023-12-18-agm']]),
}

function request(url: string, headers: Record<string, string> = {}) {
    return new Request(url, { headers })
}

describe('getRequestHostname', () => {
    it('prefers X-Forwarded-Host, taking the first of several', () => {
        expect(
            getRequestHostname(
                request('https://worker.example.dev/', {
                    'X-Forwarded-Host': 'Blog.Example.com:443, proxy.internal',
                }),
            ),
        ).toBe('blog.example.com')
    })

    it('falls back to the Forwarded header', () => {
        expect(
            getRequestHostname(
                request('https://worker.example.dev/', { Forwarded: 'for=192.0.2.1;host="blog.example.com";proto=https' }),
            ),
        ).toBe('blog.example.com')
    })

    it('falls back to the request URL host', () => {
        expect(getRequestHostname(request('https://blog.example.com/x'))).toBe('blog.example.com')
    })
})

describe('getLegacyBlogRedirect', () => {
    it('ignores requests for other hosts', () => {
        expect(getLegacyBlogRedirect(request('https://example.com/agm-announcement-8e0648b7d173'), options)).toBeNull()
    })

    it('redirects a known post path to its new post, dropping the query and trailing slash', () => {
        const response = getLegacyBlogRedirect(
            request('https://blog.example.com/agm-announcement-8e0648b7d173/?source=rss----1'),
            options,
        )
        expect(response?.status).toBe(301)
        expect(response?.headers.get('Location')).toBe('https://example.com/blog/2023-12-18-agm')
    })

    it('redirects anything else on the legacy host to the blog index on the canonical domain', () => {
        for (const path of ['/', '/archive', '/@someone', '/blog/2023-12-18-agm']) {
            const response = getLegacyBlogRedirect(request(`https://blog.example.com${path}`), options)
            expect(response?.headers.get('Location')).toBe('https://example.com/blog')
        }
    })

    it('matches a forwarded legacy host even when the URL host is the worker', () => {
        const response = getLegacyBlogRedirect(
            request('https://example.com/agm-announcement-8e0648b7d173', { 'X-Forwarded-Host': 'blog.example.com' }),
            options,
        )
        expect(response?.headers.get('Location')).toBe('https://example.com/blog/2023-12-18-agm')
    })
})
