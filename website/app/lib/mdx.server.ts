import { readdir, readFile } from 'fs/promises'
import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { CloudflareEnv } from '../remix-app-load-context'
import { compileMdx } from './compile-mdx.server'
import { getGitHubConfig, shouldUseGitHubContent } from './config.server'
import { downloadMdxFileOrDirectory } from './github.server'

const NO_CACHE = process.env.NO_CACHE != null ? process.env.NO_CACHE === 'true' : undefined

export interface FrontmatterProperties {
    title?: string
    linkText?: string
    summary?: string
    draft?: boolean
    date?: DateTime
    dateDisplay: string

    layout?: 'with-sidebar' | 'full-width'

    // Blog post specific
    featured?: boolean
    image?: string
    imageAlt?: string
    authors?: string[]
}

type ContentResultValue =
    | {
          kind: 'found'
          content: string
      }
    | {
          kind: 'not-found'
      }

const contentCache = new LRUCache<string, ContentResultValue>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 60 * 10, // 10 mins
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

const compilationCache = new LRUCache<string, string>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 60 * 60 * 24, // 24 hours
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

const contentListingCache = new LRUCache<string, string[]>({
    max: 250,
    maxSize: 1024 * 1024 * 12, // 12 mb
    ttl: 1000 * 60 * 60, // 1 hour
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

// export function getBlogPost(slug: string) {
//     const contents = blogPostsBySlug[slug]
//     if (!contents) {
//         throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
//     }

//     const postData = contents.frontmatter

//     const validatedAuthors = getValidAuthorNames(postData.authors)
//     if (validatedAuthors.length === 0) {
//         console.warn(
//             'The author info in `%s` is incorrect and should be fixed to match what’s in the `authors.yml` file.',
//             slug,
//         )
//     }
//     postData.authors = validatedAuthors

//     const post: BlogPost = {
//         frontmatter: {
//             ...postData,
//             slug,
//             blogAuthors: postData.authors.map(getAuthor).filter((a): a is BlogAuthor => !!a),
//             dateDisplay: formatDate(postData.date),
//         },
//         Component: contents.Component,
//     }

//     return post
// }

export async function getPage(env: CloudflareEnv, slug: string, type: 'blog' | 'page') {
    const pageContents = await getContentWithCache(env, getContentDirectory(type), slug)
    if (pageContents.kind === 'found') {
        const compiledPage = await getMdxPageWithCache(env, slug, pageContents.content)
        return compiledPage
    }

    return null
}

/** This will have the side effect of priming the page cache */
export async function getPagesList(env: CloudflareEnv, type: 'blog' | 'page'): Promise<
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
    const pages = await getDirectorySlugsWithCache(env, path.join('website-content', type === 'blog' ? 'posts' : 'pages'))
    const pagesList: Array<{
        title: string
        linkText: string
        slug: string
        featured: boolean
        summary?: string
        date?: string
        dateDisplay?: string
        image?: string
        imageAlt?: string
    }> = []

    for (const page of pages) {
        const compiledPage = await getPage(env, page, type)
        if (compiledPage) {
            pagesList.push({
                title: compiledPage.frontmatter.title ?? page,
                summary: compiledPage.frontmatter.summary,
                linkText: compiledPage.frontmatter.linkText ?? compiledPage.frontmatter.title ?? page,
                slug: page,
                featured: compiledPage.frontmatter.featured ?? false,
                date: compiledPage.frontmatter.date?.toISO(),
                dateDisplay: compiledPage.dateDisplay,
                image: compiledPage.frontmatter.image,
                imageAlt: compiledPage.frontmatter.imageAlt,
            })
        }
    }

    return pagesList
}

export async function getDirectorySlugsWithCache(env: CloudflareEnv, contentDir: string) {
    const cacheKey = contentDir
    const cached = contentListingCache.get(cacheKey)
    if (!NO_CACHE && cached) {
        return cached
    }

    const contents = await getDirectorySlugs(env, contentDir)
    contentListingCache.set(cacheKey, contents)
    return contents
}

export async function getDirectorySlugs(env: CloudflareEnv, contentDir: string) {
    if (shouldUseGitHubContent(env) || process.env.NODE_ENV === 'production') {
        const files = await downloadMdxFileOrDirectory(env, contentDir)
        return files.files.map((file) =>
            file.path
                .replace(/\\/g, '/')
                .replace(`${contentDir.replace(/\\/g, '/')}/`, '')
                .replace(/\.mdx$/, ''),
        )
    }

    const dir = path.resolve(process.cwd(), '../', contentDir)
    const files = await readdir(dir)
    return files.map((file) =>
        file
            .replace(/\\/g, '/')
            .replace(`${contentDir.replace(/\\/g, '/')}/`, '')
            .replace(/\.mdx$/, ''),
    )
}

async function getContentWithCache(env: CloudflareEnv, contentDir: string, slug: string) {
    const cacheKey = `${contentDir}/${slug}`
    const cached = contentCache.get(cacheKey)
    if (!NO_CACHE && cached) {
        return cached
    }

    const contents = await getContents(env, contentDir, slug)
    contentCache.set(cacheKey, contents)
    return contents
}

function hashContent(content: string): string {
    return createHash('sha256').update(content).digest('hex')
}

async function getContents(env: CloudflareEnv, contentDir: string, slug: string): Promise<ContentResultValue> {
    if (shouldUseGitHubContent(env) || process.env.NODE_ENV === 'production') {
        const file = await downloadMdxFileOrDirectory(env, `${contentDir}/${slug}`)
        if (file.files.length !== 1) {
            return { kind: 'not-found' }
        }

        return { kind: 'found', content: file.files[0].content }
    }

    const content = await readFile(path.resolve(process.cwd(), '../', contentDir, `${slug}.mdx`), 'utf-8')
    return { kind: 'found', content }
}

async function getMdxPageWithCache(env: CloudflareEnv, slug: string, contents: string) {
    const cacheKey = `mdx-${slug}-${hashContent(contents)}`
    const cached = compilationCache.get(cacheKey)
    if (!NO_CACHE && cached) {
        return JSON.parse(cached) as ReturnType<typeof getMdxPage>
    }

    const compiledPage = await getMdxPage(env, slug, contents)
    compilationCache.set(cacheKey, JSON.stringify(compiledPage))
    return compiledPage
}

async function getMdxPage(env: CloudflareEnv, slug: string, contents: string) {
    const compiledPage = await compileMdx<FrontmatterProperties>(slug, contents)

    if (compiledPage) {
        const github = getGitHubConfig(env)
        return {
            dateDisplay: compiledPage.frontmatter.date ? formatDate(compiledPage.frontmatter.date) : undefined,
            ...compiledPage,
            slug,
            editLink: `https://github.com/${github.organization}/${github.repo}/edit/${github.ref}/${slug}.mdx`,
        }
    } else {
        return null
    }
}

function getContentDirectory(type: 'blog' | 'page'): string {
    return type === 'blog' ? path.join('blog', 'posts') : path.join('website-content', 'pages')
}

function formatDate(date: DateTime) {
    const offset = new Date().getTimezoneOffset()

    return (
        date
            // Necessary to set the offset for local development
            .plus({ minutes: offset })
            .toLocaleString(DateTime.DATE_FULL, {
                locale: 'en-AU',
            })
    )
}
