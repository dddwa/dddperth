/* eslint-disable @typescript-eslint/no-explicit-any */
import type { MDXContent } from 'mdx/types.js'
import { ReactNode } from 'react'
import { z } from 'zod'

const MarkdownPostFrontmatter = z.object({
    title: z.string(),
    summary: z.string().optional(),
    draft: z.boolean().optional(),
    featured: z.boolean().optional(),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
})

const postContentsBySlug = Object.fromEntries(
    Object.entries(
        import.meta.glob(['../../../website-content/pages/*.md', '../../../website-content/pages/*.mdx'], {
            eager: true,
        }),
    ).map(([filePath, contents]) => [
        filePath
            .replace('../../../website-content/pages', '')
            .replace(/\.md?x$/, '')
            .replace(/^\//, ''),
        {
            default: (contents as any).default as MDXContent,
            frontmatter: MarkdownPostFrontmatter.parse((contents as any).frontmatter),
        },
    ]),
)

export async function getPage(slug: string): Promise<{
    frontmatter: any
    default: MDXContent
}> {
    const contents = postContentsBySlug[slug]
    if (!contents) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return contents

    // const postData = parsedAttributes.data

    // const post: BlogPost = {
    //     ...postData,
    //     html,
    // }
    // pagesCache.set(slug, post)
    // return post
}

/**
 * Markdown frontmatter data describing a post
 */
interface MarkdownPost extends z.infer<typeof MarkdownPostFrontmatter> {
    component: ReactNode
}

export interface BlogPost extends Omit<MarkdownPost, 'authors'> {}
