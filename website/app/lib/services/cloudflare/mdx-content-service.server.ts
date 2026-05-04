import { DateTime } from 'luxon'
import bundles from 'virtual:mdx-bundles'
import type { AppConfig } from '../app-config'
import type { ContentListItem, ContentPage, ContentService, ContentType } from '../content-service'
import type { FrontmatterProperties } from '../../mdx-types'

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
 * MDX-bundler-backed content service. The `bundles` virtual import is a
 * Vite plugin output so it isn't Cloudflare-specific — but the GitHub edit
 * link is config-driven, which is what makes this implementation portable.
 */
export function createMdxContentService(config: AppConfig): ContentService {
    return {
        async getPage(slug, type, options = {}): Promise<ContentPage | null> {
            const entry = bundles[type][slug]
            if (!entry) return null

            const frontmatter = coerceFrontmatter(entry.frontmatter)
            const code = options.includeCode ? await entry.code() : undefined

            return {
                frontmatter,
                slug,
                type,
                code,
                dateDisplay: frontmatter.date ? formatDate(frontmatter.date) : undefined,
                editLink: `https://github.com/${config.github.organization}/${config.github.repo}/edit/${config.github.ref}/${contentSubPath(
                    type,
                )}/${slug}.${type === 'blog' ? 'md' : 'mdx'}`,
            }
        },

        async getPagesList(type): Promise<ContentListItem[]> {
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
        },
    }
}
