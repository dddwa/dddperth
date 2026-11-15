import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { visit } from 'unist-util-visit'
import type { EventMarkdownTree } from './event-markdown'

/**
 * An event description (Markdown, typed by an admin) → the HTML tree the
 * event page renders. Done in the loader so the parser never ships to the
 * browser; the page only maps the finished tree onto React elements.
 *
 * Safe by construction rather than by escaping a string:
 * - raw HTML in the Markdown is dropped (remark-rehype leaves it out unless
 *   `allowDangerousHtml` is set), so there's no `<script>` or `onclick` to
 *   strip;
 * - link and image URLs are kept only for http(s), mailto:, tel:, and
 *   site-relative paths — `[x](javascript:…)` parses as a perfectly good
 *   Markdown link, so this has to be checked here;
 * - headings move down a level, because the page's title is the one `<h1>`.
 */
export async function renderEventMarkdown(markdown: string): Promise<EventMarkdownTree> {
    const processor = unified().use(remarkParse).use(remarkGfm).use(remarkRehype)
    const tree = await processor.run(processor.parse(markdown))

    visit(tree, (node) => {
        // Positions are only for error messages; they'd just bloat the payload.
        delete node.position
        if (node.type !== 'element') return

        const heading = /^h([1-6])$/.exec(node.tagName)
        if (heading) node.tagName = `h${Math.min(Number(heading[1]) + 1, 6)}`

        for (const attribute of ['href', 'src'] as const) {
            const value = node.properties[attribute]
            if (value === undefined) continue
            if (typeof value !== 'string' || !isSafeUrl(value)) delete node.properties[attribute]
        }
    })

    return tree
}

/** Plain text from the rendered description, for the page's meta description. */
export function eventSummary(tree: EventMarkdownTree, maxLength = 160): string {
    const parts: string[] = []
    visit(tree, 'text', (node) => {
        parts.push(node.value)
    })
    // Blocks are already separated by newline text nodes, so no joiner is needed.
    const text = parts.join('').replace(/\s+/g, ' ').trim()
    if (text.length <= maxLength) return text
    return `${text.slice(0, maxLength - 1).replace(/\s+\S*$/, '')}…`
}

function isSafeUrl(url: string): boolean {
    const trimmed = url.trim()
    // Site-relative and in-page. `//host` is protocol-relative, so it's an
    // external URL in disguise and has to pass the protocol check instead.
    if ((trimmed.startsWith('/') && !trimmed.startsWith('//')) || trimmed.startsWith('#')) return true
    try {
        return ['http:', 'https:', 'mailto:', 'tel:'].includes(new URL(trimmed).protocol)
    } catch {
        return false
    }
}
