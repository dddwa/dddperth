import { DateTime } from 'luxon'
import bundles from 'virtual:mdx-bundles'
import type { CloudflareEnv } from '../remix-app-load-context'

export interface FrontmatterProperties {
    title?: string
    linkText?: string
    summary?: string
    draft?: boolean
    date?: string
    dateDisplay?: string

    layout?: 'with-sidebar' | 'full-width'

    // Blog post specific
    featured?: boolean
    image?: string
    imageAlt?: string
    authors?: string[]
}

type ContentType = 'blog' | 'page'

function contentSubPath(type: ContentType): string {
    return type === 'blog' ? 'blog/posts' : 'website-content/pages'
}

function formatDate(iso: string): string {
    const dt = DateTime.fromISO(iso)
    const offset = new Date().getTimezoneOffset()
    return dt.plus({ minutes: offset }).toLocaleString(DateTime.DATE_FULL, { locale: 'en-AU' })
}

function coerceFrontmatter(frontmatter: Record<string, unknown>): FrontmatterProperties {
    const raw = frontmatter
    const dateValue = raw.date
    let dateIso: string | undefined
    if (dateValue instanceof Date) {
        dateIso = dateValue.toISOString()
    } else if (typeof dateValue === 'string') {
        dateIso = dateValue
    }

    return {
        ...(raw as FrontmatterProperties),
        date: dateIso,
    }
}

/**
 * Returns the metadata for an MDX page. The component itself is resolved on
 * the client via {@link import('./mdx').useMdxPage}, which keeps the loader
 * payload JSON-serializable.
 *
 * Pass `{ includeCode: true }` to also return the raw mdx-bundler IIFE
 * string. Only the public app-content API needs this — it's the contract the
 * React Native app evaluates with `new Function`. Worker-side rendering uses
 * the ESM module returned by `entry.load()` instead.
 */
export async function getPage(
    env: CloudflareEnv,
    slug: string,
    type: ContentType,
    options: { includeCode?: boolean } = {},
) {
    const entry = bundles[type][slug]
    if (!entry) return null

    const frontmatter = coerceFrontmatter(entry.frontmatter)
    const organization = env.GITHUB_ORGANIZATION
    const repo = env.GITHUB_REPO
    const ref = env.GITHUB_REF ?? 'main'

    const code = options.includeCode ? await entry.code() : undefined

    return {
        frontmatter,
        slug,
        type,
        code,
        dateDisplay: frontmatter.date ? formatDate(frontmatter.date) : undefined,
        editLink: `https://github.com/${organization}/${repo}/edit/${ref}/${contentSubPath(type)}/${slug}.${
            type === 'blog' ? 'md' : 'mdx'
        }`,
    }
}

export async function getPagesList(
    _env: CloudflareEnv,
    type: ContentType,
): Promise<
    Array<{
        title: string
        summary?: string
        linkText: string
        slug: string
        featured: boolean
        date?: string
        dateDisplay?: string
        image?: string
        imageAlt?: string
    }>
> {
    return Object.entries(bundles[type]).map(([slug, entry]) => {
        const frontmatter = coerceFrontmatter(entry.frontmatter)
        return {
            title: frontmatter.title ?? slug,
            summary: frontmatter.summary,
            linkText: frontmatter.linkText ?? frontmatter.title ?? slug,
            slug,
            featured: frontmatter.featured ?? false,
            date: frontmatter.date,
            dateDisplay: frontmatter.date ? formatDate(frontmatter.date) : undefined,
            image: frontmatter.image,
            imageAlt: frontmatter.imageAlt,
        }
    })
}
