import type { HeadersFunction, LoaderFunctionArgs, MetaFunction } from 'react-router'
import { data, useLoaderData } from 'react-router'
import invariant from 'tiny-invariant'

import { useRef } from 'react'
import type { BlogAuthor} from '~/lib/authors.server';
import { getAuthor, getValidAuthorNames } from '~/lib/authors.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getPage } from '~/lib/mdx.server'
import { conferenceConfig } from '../config/conference-config'
import { socials } from '../config/socials'

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { slug } = params
    invariant(!!slug, 'Expected slug param')
    const requestUrl = new URL(request.url)
    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await getPage(slug, 'blog')
    if (!post) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    return data(
        {
            siteUrl,
            frontmatter: post.frontmatter,
            post: post.code,
            blogAuthors: getValidAuthorNames(post.frontmatter.authors ?? [])
                .map(getAuthor)
                .filter((a): a is BlogAuthor => !!a),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
    // Inherit the caching headers from the loader so we do't cache 404s
    return loaderHeaders
}

export const meta: MetaFunction<typeof loader> = (args) => {
    const { data, params } = args
    const { slug } = params
    invariant(!!slug, 'Expected slug param')

    const { siteUrl, frontmatter } = data || {}
    if (!frontmatter) {
        return [{ title: `404 Not Found | ${conferenceConfig.name}` }]
    }

    const ogImageUrl = siteUrl ? new URL(`${siteUrl}/img/${slug}`) : null
    if (ogImageUrl) {
        if (frontmatter.title) {
            ogImageUrl.searchParams.set('title', frontmatter.title)
        }
        // TODO Figure out what is going on here
        // if (frontmatter.date) {
        //     ogImageUrl.searchParams.set('date', frontmatter.date.toString())
        // }
        if (data?.blogAuthors) {
            for (const { name, title } of data.blogAuthors) {
                ogImageUrl.searchParams.append('authorName', name)
                ogImageUrl.searchParams.append('authorTitle', title)
            }
        }
    }

    const socialImageUrl = ogImageUrl?.toString()
    const url = siteUrl ? `${siteUrl}/blog/${slug}` : null

    return [
        { title: `${frontmatter.title} | ${conferenceConfig.name}` },
        { name: 'description', content: frontmatter.summary },
        { property: 'og:url', content: url },
        { property: 'og:title', content: frontmatter.title },
        { property: 'og:image', content: socialImageUrl },
        { property: 'og:description', content: frontmatter.summary },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:creator', content: `@${socials.Twitter.Name}` },
        { name: 'twitter:site', content: `@${socials.Twitter.Name}` },
        { name: 'twitter:title', content: frontmatter.title },
        { name: 'twitter:description', content: frontmatter.summary },
        { name: 'twitter:image', content: socialImageUrl },
        {
            name: 'twitter:image:alt',
            content: socialImageUrl ? frontmatter.imageAlt : undefined,
        },
    ]
}

export default function BlogPost() {
    const { post, frontmatter, blogAuthors } = useLoaderData<typeof loader>()
    const mdRef = useRef<HTMLDivElement>(null)

    return (
        <>
            {frontmatter.draft ? (
                <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
            ) : null}
            <div>
                <div>
                    <div>
                        <div>
                            <div>
                                <img src={frontmatter.image} alt={frontmatter.imageAlt} />
                            </div>
                            <div>
                                <div>
                                    {/* <div>{frontmatter.date}</div> */}
                                    <div>{frontmatter.title}</div>
                                </div>
                                <div>
                                    {blogAuthors.map((author) => (
                                        <div key={author.name}>
                                            <div>
                                                <img src={author.avatar} alt="" />
                                            </div>
                                            <div>
                                                <div>{author.name}</div>
                                                <div>{author.title}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div
                                // The markdown comes in via the parser wrapped in `div.md-prose`
                                // so we don't need to do that here
                                ref={mdRef}
                                className="md-prose"
                                dangerouslySetInnerHTML={{ __html: post }}
                            />
                            <hr />
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
