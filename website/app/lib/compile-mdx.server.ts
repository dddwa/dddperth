import { remarkCodeBlocksShiki } from '@kentcdodds/md-temp'
import remarkEmbedder, { type TransformerInfo } from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type * as H from 'hast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { bundleMDX } from 'mdx-bundler'
import PQueue from 'p-queue'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import gfm from 'remark-gfm'
import type * as U from 'unified'
import { visit } from 'unist-util-visit'

function handleEmbedderError({ url }: { url: string }) {
    return `<p>Error embedding <a href="${url}">${url}</a></p>.`
}

type GottenHTML = string | null
function handleEmbedderHtml(html: GottenHTML, info: TransformerInfo) {
    if (!html) return null

    const url = new URL(info.url)
    // matches youtu.be and youtube.com
    if (/youtu\.?be/.test(url.hostname)) {
        // this allows us to set youtube embeds to 100% width and the
        // height will be relative to that width with a good aspect ratio
        return makeEmbed(html, 'youtube')
    }
    if (url.hostname.includes('codesandbox.io')) {
        return makeEmbed(html, 'codesandbox', '80%')
    }
    return html
}

function makeEmbed(html: string, type: string, heightRatio = '56.25%') {
    return `
  <div class="embed" data-embed-type="${type}">
    <div style="padding-bottom: ${heightRatio}">
      ${html}
    </div>
  </div>
`
}

function trimCodeBlocks() {
    return async function transformer(tree: H.Root) {
        visit(tree, 'element', (preNode: H.Element) => {
            if (preNode.tagName !== 'pre' || !preNode.children.length) {
                return
            }
            const codeNode = preNode.children[0]
            if (!codeNode || codeNode.type !== 'element' || codeNode.tagName !== 'code') {
                return
            }
            const [codeStringNode] = codeNode.children
            if (!codeStringNode) return

            if (codeStringNode.type !== 'text') {
                console.warn(`trimCodeBlocks: Unexpected: codeStringNode type is not "text": ${codeStringNode.type}`)
                return
            }
            codeStringNode.value = codeStringNode.value.trim()
        })
    }
}

function removeDoublePInDetails() {
    return async function removeDoublePInDetails(tree: H.Root) {
        visit(tree, { type: 'mdxJsxFlowElement', name: 'details' }, function visitor(node: MdxJsxFlowElement) {
            if (!node.children) return

            // The details element requires a p element, so it inserts one. If the user also has inserted one, things break
            if (
                node.children.length === 2 &&
                node.children[1].type === 'mdxJsxFlowElement' &&
                node.children[1].name === 'p'
            ) {
                if (
                    node.children[1].children.length === 1 &&
                    (node.children[1].children[0] as unknown as H.Element).type === 'element' &&
                    (node.children[1].children[0] as unknown as H.Element).tagName === 'p'
                ) {
                    node.children[1] = node.children[1].children[0] as any
                }
            }
        })
    }
}

function removePreContainerDivs() {
    return async function preContainerDivsTransformer(tree: H.Root) {
        visit(tree, { type: 'element', tagName: 'pre' }, function visitor(node, index, parent) {
            if (parent?.type !== 'element') return
            if (parent.tagName !== 'div') return
            if (parent.children.length !== 1 && index === 0) return
            Object.assign(parent, node)
        })
    }
}

const remarkPlugins: U.PluggableList = [
    [
        'default' in remarkEmbedder ? remarkEmbedder.default : (remarkEmbedder as any),
        {
            handleError: handleEmbedderError,
            handleHTML: handleEmbedderHtml,
            transformers: [oembedTransformer],
        },
    ],
]

const rehypePlugins: U.PluggableList = [
    removeDoublePInDetails,
    trimCodeBlocks,
    remarkCodeBlocksShiki,
    removePreContainerDivs,
]

async function compileMdx<FrontmatterType>(slug: string, content: string) {
    console.log('Compiling MDX for slug:', slug)
    try {
        const { frontmatter, code } = await bundleMDX({
            source: content,
            mdxOptions(options) {
                options.remarkPlugins = [...(options.remarkPlugins ?? []), gfm, ...remarkPlugins]
                options.rehypePlugins = [
                    ...(options.rehypePlugins ?? []),
                    rehypeSlug,
                    [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                    ...rehypePlugins,
                ]
                return options
            },
        })

        return {
            code,
            frontmatter: frontmatter as FrontmatterType,
        }
    } catch (error: unknown) {
        console.error(`Compilation error for slug: `, slug)
        console.error((error as any).errors)
        throw error
    }
}

let _queue: PQueue | null = null
async function getQueue() {
    if (_queue) return _queue

    _queue = new PQueue({
        concurrency: 1,
        throwOnTimeout: true,
        timeout: 1000 * 30,
    })
    return _queue
}

// We have to use a queue because we can't run more than one of these at a time
// or we'll hit an out of memory error because esbuild uses a lot of memory...
async function queuedCompileMdx<FrontmatterType>(...args: Parameters<typeof compileMdx>) {
    const queue = await getQueue()
    const result = await queue.add(() => compileMdx<FrontmatterType>(...args))
    return result
}

export { queuedCompileMdx as compileMdx }
