import type { FrontmatterProperties } from '../mdx-types'

export type ContentType = 'blog' | 'page'

export interface ContentPage {
    frontmatter: FrontmatterProperties
    slug: string
    type: ContentType
    code: string | undefined
    dateDisplay: string | undefined
    editLink: string
}

export interface ContentListItem {
    title: string
    summary?: string
    linkText: string
    slug: string
    featured: boolean
    date?: string
    dateDisplay?: string
    image?: string
    imageAlt?: string
}

export interface ContentService {
    getPage(slug: string, type: ContentType, options?: { includeCode?: boolean }): Promise<ContentPage | null>
    getPagesList(type: ContentType): Promise<ContentListItem[]>
}
