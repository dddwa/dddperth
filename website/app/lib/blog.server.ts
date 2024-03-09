import { LRUCache } from 'lru-cache'
import { DateTime } from 'luxon'
import yaml from 'yaml'
import { z } from 'zod'
import { processMarkdown } from '~/lib/md.server'
import authorsYamlFileContents from '../../../blog/authors.yml?raw'

const postContentsBySlug = Object.fromEntries(
    Object.entries(import.meta.glob('../../../blog/posts/*.md', { query: 'raw', eager: true })).map(
        ([filePath, contents]) => [
            filePath.replace('../../../blog/posts', '').replace(/\.md$/, '').replace(/^\//, ''),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            typeof contents === 'string' ? contents : (contents as any).default,
        ],
    ),
)

const AUTHORS: BlogAuthor[] = yaml.parse(authorsYamlFileContents)
const AUTHOR_NAMES = AUTHORS.map((a) => a.name)

const postsCache = new LRUCache<string, BlogPost>({
    maxSize: 1024 * 1024 * 12, // 12 mb
    sizeCalculation(value, key) {
        return JSON.stringify(value).length + (key ? key.length : 0)
    },
})

export async function getBlogPost(slug: string): Promise<BlogPost> {
    const cached = postsCache.get(slug)
    if (cached && process.env.NODE_ENV === 'production') return cached
    const contents = postContentsBySlug[slug]
    if (!contents) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const result = await processMarkdown(contents)
    const { attributes, html } = result
    const parsedAttributes = MarkdownPostFrontmatter.safeParse(attributes)
    if (!parsedAttributes.success) {
        throw new Error(
            `Invalid frontmatter in ${slug}.md, missing ${JSON.stringify(
                Object.keys(parsedAttributes.error.format())
                    .filter((key) => key !== '_errors')
                    .join(', '),
            )}`,
        )
    }
    const postData = parsedAttributes.data

    const validatedAuthors = getValidAuthorNames(postData.authors)
    if (validatedAuthors.length === 0) {
        console.warn(
            'The author info in `%s` is incorrect and should be fixed to match what’s in the `authors.yaml` file.',
            slug,
        )
    }
    postData.authors = validatedAuthors

    const post: BlogPost = {
        ...postData,
        authors: postData.authors.map(getAuthor).filter((a): a is BlogAuthor => !!a),
        dateDisplay: formatDate(postData.date),
        html,
    }
    postsCache.set(slug, post)
    return post
}

export async function getBlogPostListings(): Promise<Array<MarkdownPostListing>> {
    const slugs = Object.keys(postContentsBySlug)
    const listings: Array<MarkdownPostListing & { date: Date }> = []
    for (const slug of slugs) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { html, authors, ...listing } = await getBlogPost(slug)
        if (!listing.draft) {
            listings.push({ slug, ...listing })
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return listings.sort((a, b) => b.date.getTime() - a.date.getTime()).map(({ date, ...listing }) => listing)
}

function getAuthor(name: string): BlogAuthor | undefined {
    return AUTHORS.find((a) => a.name === name)
}

function getValidAuthorNames(authorNames: string[]) {
    return authorNames.filter((authorName) => AUTHOR_NAMES.includes(authorName))
}

function formatDate(date: Date) {
    const offset = new Date().getTimezoneOffset()
    return (
        DateTime.fromJSDate(date)
            // Necessary to set the offset for local development
            .plus({ minutes: offset })
            .toLocaleString(DateTime.DATE_FULL, {
                locale: 'en-US',
            })
    )
}

const MarkdownPostFrontmatter = z.object({
    title: z.string(),
    summary: z.string().optional(),
    date: z.date(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    authors: z.array(z.string()),
})

interface MarkdownPostListing {
    title: string
    slug: string
    summary?: string
    dateDisplay: string
    image?: string
    imageAlt?: string
    featured?: boolean
}

/**
 * Markdown frontmatter data describing a post
 */
interface MarkdownPost extends z.infer<typeof MarkdownPostFrontmatter> {
    dateDisplay: string
    html: string
}

export interface BlogAuthor {
    name: string
    title: string
    avatar: string
}

export interface BlogPost extends Omit<MarkdownPost, 'authors'> {
    authors: BlogAuthor[]
}
