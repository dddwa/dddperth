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
