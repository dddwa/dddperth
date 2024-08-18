/* eslint-disable @typescript-eslint/no-explicit-any */
import { DateTime } from 'luxon'
import { MDXContent } from 'mdx/types'
import yaml from 'yaml'
import { ZodError, ZodType, z } from 'zod'
import authorsYamlFileContents from '../../../blog/authors.yml?raw'

type MarkdownFilesBySlug<Schema extends ZodType> = Record<
    string,
    { Component: MDXContent; frontmatter: z.infer<Schema> }
>

const blogPostFiles = import.meta.glob(['../../../blog/posts/**/*.md', '../../../blog/posts/**/*.mdx'], {
    eager: true,
})

const websitePagesFiles = import.meta.glob(
    ['../../../website-content/pages/**/*.md', '../../../website-content/pages/**/*.mdx'],
    {
        eager: true,
    },
)

const BlogPostFrontmatter = z.object({
    title: z.string(),
    date: z.string().transform((dateString) => {
        const parsed = DateTime.fromISO(dateString)
        if (!parsed.isValid) {
            throw parsed.invalidExplanation
        }

        return parsed
    }),
    summary: z.string().optional(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    authors: z.array(z.string()),
})

const PageFrontmatter = z.object({
    title: z.string(),
    summary: z.string().optional(),
    draft: z.boolean().optional(),

    layout: z.union([z.literal('with-sidebar'), z.literal('full-width')]).default('with-sidebar'),
})

const blogPostsBySlug = toPagesBySlug(blogPostFiles, '../../../blog/posts', BlogPostFrontmatter)
const websitePagesBySlug = toPagesBySlug(websitePagesFiles, '../../../website-content/pages', PageFrontmatter)

export function getPage(slug: string) {
    const contents = websitePagesBySlug[slug]
    if (!contents) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    return contents
}

const AUTHORS: BlogAuthor[] = yaml.parse(authorsYamlFileContents)
const AUTHOR_NAMES = AUTHORS.map((a) => a.name)

export type BlogPost = {
    frontmatter: z.infer<typeof BlogPostFrontmatter> & {
        slug: string
        blogAuthors: BlogAuthor[]
        dateDisplay: string
    }
    Component: MDXContent
}

export function getBlogPost(slug: string) {
    const contents = blogPostsBySlug[slug]
    console.log('contents', blogPostsBySlug, slug)
    if (!contents) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const postData = contents.frontmatter

    const validatedAuthors = getValidAuthorNames(postData.authors)
    if (validatedAuthors.length === 0) {
        console.warn(
            'The author info in `%s` is incorrect and should be fixed to match what’s in the `authors.yml` file.',
            slug,
        )
    }
    postData.authors = validatedAuthors

    const post: BlogPost = {
        frontmatter: {
            ...postData,
            slug,
            blogAuthors: postData.authors.map(getAuthor).filter((a): a is BlogAuthor => !!a),
            dateDisplay: formatDate(postData.date),
        },
        Component: contents.Component,
    }

    return post
}

export async function getBlogPostListings(): Promise<Array<BlogPost['frontmatter']>> {
    const slugs = Object.keys(blogPostsBySlug)
    const listings: Array<BlogPost['frontmatter']> = []
    for (const slug of slugs) {
        const post = getBlogPost(slug)
        if (!post.frontmatter.draft) {
            listings.push(post.frontmatter)
        }
    }

    return listings.sort((a, b) => b.date.toJSDate().getTime() - a.date.toJSDate().getTime())
}

function getAuthor(name: string): BlogAuthor | undefined {
    return AUTHORS.find((a) => a.name === name)
}

function getValidAuthorNames(authorNames: string[]) {
    return authorNames.filter((authorName) => AUTHOR_NAMES.includes(authorName))
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

export interface BlogAuthor {
    name: string
    title: string
    avatar: string
}

function toPagesBySlug<Schema extends ZodType>(
    files: Record<string, unknown>,
    basePath: string,
    frontmatterSchema: Schema,
): MarkdownFilesBySlug<Schema> {
    return Object.fromEntries(
        Object.entries(files).map(([filePath, contents]) => {
            const c = contents as any

            try {
                return [
                    filePath
                        .replace(basePath, '')
                        .replace(/\.md?x$/, '')
                        .replace(/^\//, ''),
                    {
                        Component: c.default as MDXContent,
                        frontmatter: frontmatterSchema.parse(c.frontmatter),
                    },
                ]
            } catch (err) {
                if (err instanceof ZodError) {
                    throw new Error(
                        `${filePath} frontmatter error(s): ${err.errors
                            .map((error) => {
                                if (error.code === 'invalid_type') {
                                    return `${error.path.join('.')} should be a ${error.expected}`
                                }
                                return `${error.message}`
                            })
                            .join(', ')}`,
                    )
                }

                throw err
            }
        }),
    )
}
