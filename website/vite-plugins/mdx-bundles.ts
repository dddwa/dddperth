import { rehypeCodeBlocksShiki } from '@kentcdodds/md-temp'
import remarkEmbedder, { type TransformerInfo } from '@remark-embedder/core'
import oembedTransformer from '@remark-embedder/transformer-oembed'
import type * as H from 'hast'
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx'
import { bundleMDX } from 'mdx-bundler'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import PQueue from 'p-queue'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeSlug from 'rehype-slug'
import gfm from 'remark-gfm'
import type * as U from 'unified'
import { visit } from 'unist-util-visit'
import type { Plugin } from 'vite'

// Why two virtual modules:
//
// `virtual:mdx-bundles` is the index — it re-exports every compiled MDX entry
// as a lazy import. We can't `new Function(code)` at request time because
// workerd (Cloudflare Workers) disallows eval, so each MDX file becomes its
// own ESM module at `virtual:mdx-bundle/<type>/<slug>` with a proper `export
// default` component. The index wires them together so the app keeps a single
// `import bundles from 'virtual:mdx-bundles'` entry point.
const INDEX_ID = 'virtual:mdx-bundles'
const INDEX_RESOLVED = '\0virtual:mdx-bundles'
const ITEM_PREFIX = 'virtual:mdx-bundle/'
const ITEM_RESOLVED_PREFIX = '\0virtual:mdx-bundle/'
// Third virtual module type: exposes the original mdx-bundler IIFE as a
// string for the public app-content API. The React Native app evaluates it
// with `new Function('React','ReactDOM','_jsx_runtime', code)` — a contract
// the worker can't honor itself (workerd forbids eval) but external clients
// can.
const CODE_PREFIX = 'virtual:mdx-code/'
const CODE_RESOLVED_PREFIX = '\0virtual:mdx-code/'

type ContentType = 'page' | 'blog'

interface CompiledMdx {
    code: string
    frontmatter: Record<string, unknown>
}

// Items like { page: { about: string }, blog: { 2024-wrap-up: string } } where
// the string is a resolved file path. Populated once during build; reused in
// `load()` for the index module and every item module.
interface Catalog {
    page: Map<string, string>
    blog: Map<string, string>
}

function handleEmbedderError({ url }: { url: string }) {
    return `<p>Error embedding <a href="${url}">${url}</a></p>.`
}

function handleEmbedderHtml(html: string | null, info: TransformerInfo) {
    if (!html) return null
    const url = new URL(info.url)
    if (/youtu\.?be/.test(url.hostname)) return makeEmbed(html, 'youtube')
    if (url.hostname.includes('codesandbox.io')) return makeEmbed(html, 'codesandbox', '80%')
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
            if (preNode.tagName !== 'pre' || !preNode.children.length) return
            const codeNode = preNode.children[0]
            if (!codeNode || codeNode.type !== 'element' || codeNode.tagName !== 'code') return
            const [codeStringNode] = codeNode.children
            if (!codeStringNode || codeStringNode.type !== 'text') return
            codeStringNode.value = codeStringNode.value.trim()
        })
    }
}

function removeDoublePInDetails() {
    return async function removeDoublePInDetails(tree: H.Root) {
        visit(tree, { type: 'mdxJsxFlowElement', name: 'details' }, function visitor(node: MdxJsxFlowElement) {
            if (!node.children) return
            if (
                node.children.length === 2 &&
                node.children[1].type === 'mdxJsxFlowElement' &&
                node.children[1].name === 'p'
            ) {
                const inner = node.children[1].children[0] as unknown as H.Element | undefined
                if (node.children[1].children.length === 1 && inner?.type === 'element' && inner.tagName === 'p') {
                    node.children[1] = inner as unknown as MdxJsxFlowElement
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

// Some CJS-published packages get double-wrapped by ESM interop: the real
// export ends up at `m.default.default`. Probe both levels and pick the
// function/object that has the properties we expect.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unwrapDefault<T = any>(mod: unknown): T {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const m = mod as any
    if (m?.default?.default !== undefined) return m.default.default
    if (m?.default !== undefined) return m.default
    return m
}

const remarkEmbedderPlugin = unwrapDefault(remarkEmbedder)
const oembedTransformerResolved = unwrapDefault(oembedTransformer)

const remarkPlugins: U.PluggableList = [
    [
        remarkEmbedderPlugin,
        {
            handleError: handleEmbedderError,
            handleHTML: handleEmbedderHtml,
            transformers: [oembedTransformerResolved],
        },
    ],
]

const rehypePlugins: U.PluggableList = [removeDoublePInDetails, trimCodeBlocks, rehypeCodeBlocksShiki, removePreContainerDivs]

const queue = new PQueue({ concurrency: 1, timeout: 1000 * 30 })

async function compileOne(slug: string, source: string): Promise<CompiledMdx> {
    try {
        const result = await queue.add(() =>
            bundleMDX({
                source,
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
            }),
        )
        if (!result) throw new Error(`Failed to compile ${slug}`)
        return { code: result.code, frontmatter: result.frontmatter }
    } catch (err) {
        // esbuild wraps the real cause inside errors[].detail.cause — surface it
        // so build failures point at the offending content instead of the generic
        // "Cannot process MDX file with esbuild" message.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const e = err as any
        const inner = e?.errors?.[0]?.detail?.cause
        if (inner) {
            console.error(`[mdx-bundles] Failed to compile "${slug}":`, inner)
        }
        throw err
    }
}

async function readContentDir(absDir: string, extensions: string[]): Promise<Array<{ slug: string; filePath: string }>> {
    const files = await readdir(absDir)
    return files
        .filter((file) => extensions.some((ext) => file.endsWith(ext)))
        .map((file) => ({
            slug: extensions.reduce((name, ext) => name.replace(new RegExp(`${ext.replace('.', '\\.')}$`), ''), file),
            filePath: path.join(absDir, file),
        }))
}

export interface MdxBundlesOptions {
    /** Monorepo root — parent of `website/`, `website-content/`, `blog/`. */
    workspaceRoot: string
}

/**
 * The output of `bundleMDX` is an IIFE that ends with `;return Component;` —
 * designed to be fed into `new Function(...scopeVars, code)`. Workerd forbids
 * `new Function` and `eval`, so we rewrite the IIFE into a proper ESM module:
 * prepend the scope vars as real imports, strip the trailing `return`, and
 * re-export `Component.default` (the component) plus the frontmatter.
 */
function toEsmModule(compiled: CompiledMdx): string {
    // The emitted code looks like:
    //   var Component=(()=>{ ...references _jsx_runtime/React/ReactDOM... })();
    //   ;return Component;
    // We drop the trailing `;return Component;`. `Component` is now a module-
    // scoped const holding `{ default, frontmatter }`.
    const stripped = compiled.code.replace(/;\s*return Component;\s*$/, '')
    return [
        `import * as React from 'react'`,
        `import * as ReactDOM from 'react-dom'`,
        `import * as _jsx_runtime from 'react/jsx-runtime'`,
        // Silence "unused" warnings — the IIFE captures these via lexical scope
        // but some builds strip unused imports. Touch them so they stay live.
        `void React; void ReactDOM; void _jsx_runtime;`,
        stripped,
        `export default Component.default`,
        `export const frontmatter = ${JSON.stringify(compiled.frontmatter)}`,
    ].join('\n')
}

function parseItemId(id: string): { type: ContentType; slug: string } | null {
    if (!id.startsWith(ITEM_RESOLVED_PREFIX)) return null
    const rest = id.slice(ITEM_RESOLVED_PREFIX.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx < 0) return null
    const type = rest.slice(0, slashIdx) as ContentType
    const slug = rest.slice(slashIdx + 1)
    if (type !== 'page' && type !== 'blog') return null
    return { type, slug }
}

function parseCodeId(id: string): { type: ContentType; slug: string } | null {
    if (!id.startsWith(CODE_RESOLVED_PREFIX)) return null
    const rest = id.slice(CODE_RESOLVED_PREFIX.length)
    const slashIdx = rest.indexOf('/')
    if (slashIdx < 0) return null
    const type = rest.slice(0, slashIdx) as ContentType
    const slug = rest.slice(slashIdx + 1)
    if (type !== 'page' && type !== 'blog') return null
    return { type, slug }
}

export function mdxBundlesPlugin({ workspaceRoot }: MdxBundlesOptions): Plugin {
    const pageDir = path.resolve(workspaceRoot, 'website-content/pages')
    const blogDir = path.resolve(workspaceRoot, 'blog/posts')

    const catalog: Catalog = { page: new Map(), blog: new Map() }
    // Cache compiled output keyed by absolute file path so edits re-compile the
    // single affected file rather than the whole set.
    const compileCache = new Map<string, CompiledMdx>()
    let catalogPromise: Promise<void> | null = null

    async function ensureCatalog(): Promise<void> {
        if (catalogPromise) return catalogPromise
        catalogPromise = (async () => {
            const pages = await readContentDir(pageDir, ['.mdx'])
            const posts = await readContentDir(blogDir, ['.md', '.mdx'])
            catalog.page.clear()
            catalog.blog.clear()
            for (const { slug, filePath } of pages) catalog.page.set(slug, filePath)
            for (const { slug, filePath } of posts) catalog.blog.set(slug, filePath)
        })()
        return catalogPromise
    }

    async function loadCompiled(type: ContentType, slug: string): Promise<CompiledMdx> {
        await ensureCatalog()
        const filePath = catalog[type].get(slug)
        if (!filePath) throw new Error(`[mdx-bundles] Unknown ${type}: ${slug}`)
        const cached = compileCache.get(filePath)
        if (cached) return cached
        const source = await readFile(filePath, 'utf-8')
        const compiled = await compileOne(slug, source)
        compileCache.set(filePath, compiled)
        return compiled
    }

    async function renderIndex(): Promise<string> {
        // The index needs frontmatter synchronously (for listings) but the
        // component itself can be lazy. Compile everything up front so we can
        // inline frontmatter; each compiled module is cached so this is only
        // expensive on cold start.
        //
        // `load()` must return the same Promise reference on every call —
        // React's `use()` hook keys on promise identity. `import()` is cached
        // by the module loader, but Vite's build transform wraps it in a new
        // `__vitePreload(...)` call each time, which returns a fresh promise.
        // Cache the result in a module-level object so the wrapper sees the
        // same promise across renders and `use()` resolves immediately after
        // the first await.
        const pageSlugs = [...catalog.page.keys()]
        const blogSlugs = [...catalog.blog.keys()]

        const entriesFor = async (type: ContentType, slugs: string[]) => {
            const pairs = await Promise.all(
                slugs.map(async (slug) => {
                    const { frontmatter } = await loadCompiled(type, slug)
                    const importId = `${ITEM_PREFIX}${type}/${slug}`
                    const codeImportId = `${CODE_PREFIX}${type}/${slug}`
                    const cacheKey = `${type}/${slug}`
                    const codeCacheKey = `code:${type}/${slug}`
                    return (
                        `  ${JSON.stringify(slug)}: {\n` +
                        `    frontmatter: ${JSON.stringify(frontmatter)},\n` +
                        `    load: () => (__mdxLoadCache[${JSON.stringify(cacheKey)}] ??= import(${JSON.stringify(importId)})),\n` +
                        `    code: () => (__mdxLoadCache[${JSON.stringify(codeCacheKey)}] ??= import(${JSON.stringify(codeImportId)}).then(m => m.default)),\n` +
                        `  }`
                    )
                }),
            )
            return pairs.join(',\n')
        }

        const pageBody = await entriesFor('page', pageSlugs)
        const blogBody = await entriesFor('blog', blogSlugs)

        return [
            `// auto-generated by vite-plugins/mdx-bundles.ts`,
            `const __mdxLoadCache = Object.create(null)`,
            `export default {`,
            `  page: {`,
            pageBody,
            `  },`,
            `  blog: {`,
            blogBody,
            `  },`,
            `}`,
        ].join('\n')
    }

    return {
        name: 'dddperth:mdx-bundles',

        resolveId(id) {
            if (id === INDEX_ID) return INDEX_RESOLVED
            if (id.startsWith(ITEM_PREFIX)) return '\0' + id
            if (id.startsWith(CODE_PREFIX)) return '\0' + id
        },

        async load(id) {
            if (id === INDEX_RESOLVED) {
                await ensureCatalog()
                return await renderIndex()
            }
            const codeParsed = parseCodeId(id)
            if (codeParsed) {
                const compiled = await loadCompiled(codeParsed.type, codeParsed.slug)
                return `export default ${JSON.stringify(compiled.code)}`
            }
            const parsed = parseItemId(id)
            if (!parsed) return
            const compiled = await loadCompiled(parsed.type, parsed.slug)
            return toEsmModule(compiled)
        },

        configureServer(server) {
            const watchPaths = [pageDir, blogDir]
            server.watcher.add(watchPaths)

            const invalidate = (filePath: string) => {
                const isPage = filePath.startsWith(pageDir)
                const isBlog = filePath.startsWith(blogDir)
                if (!isPage && !isBlog) return

                compileCache.delete(filePath)
                // Re-scan directory list on add/unlink; keep it simple and cheap.
                catalogPromise = null

                const modsToInvalidate: string[] = [INDEX_RESOLVED]
                // Find the item id for this file path, if present, so its
                // virtual module is recompiled next request.
                for (const [type, map] of [
                    ['page', catalog.page],
                    ['blog', catalog.blog],
                ] as const) {
                    for (const [slug, fp] of map) {
                        if (fp === filePath) {
                            modsToInvalidate.push(`\0${ITEM_PREFIX}${type}/${slug}`)
                            modsToInvalidate.push(`\0${CODE_PREFIX}${type}/${slug}`)
                        }
                    }
                }

                for (const env of Object.values(server.environments)) {
                    for (const modId of modsToInvalidate) {
                        const mod = env.moduleGraph.getModuleById(modId)
                        if (mod) env.moduleGraph.invalidateModule(mod)
                    }
                }

                server.ws.send({ type: 'full-reload' })
            }

            server.watcher.on('add', invalidate)
            server.watcher.on('change', invalidate)
            server.watcher.on('unlink', invalidate)
        },
    }
}
