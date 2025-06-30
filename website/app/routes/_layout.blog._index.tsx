import * as React from 'react'
import { data, Link, useLoaderData } from 'react-router'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getPagesList } from '~/lib/mdx.server'
import type { Route } from './+types/_layout.blog._index'

export async function loader() {
    return data(
        {
            conferenceName: conferenceConfigPublic.name,
            blogDescription: conferenceConfigPublic.blogDescription,
            posts: await getPagesList('blog'),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export function meta({ data }: Route.MetaArgs) {
    return [
        { title: data.conferenceName + ' Blog' },
        {
            name: 'description',
            content: data.blogDescription,
        },
    ]
}

export default function Blog() {
    const data = useLoaderData<typeof loader>()
    const [latestPost, ...posts] = data.posts

    const featuredPosts = data.posts.filter((post) => post.featured)

    return (
        <main tabIndex={-1}>
            <div>
                <div>
                    <div>
                        <Link to={latestPost.slug} prefetch="intent">
                            <div>
                                {latestPost.image ? <img src={latestPost.image} alt={latestPost.imageAlt} /> : null}
                            </div>
                            <p>{latestPost.dateDisplay}</p>
                            <p>{latestPost.title}</p>
                            <p>{latestPost.summary}</p>
                        </Link>
                    </div>
                    <div>
                        {posts.map((post) => (
                            <div key={post.slug}>
                                <Link to={post.slug} prefetch="intent">
                                    <div>
                                        <img src={post.image} alt={post.imageAlt} />
                                    </div>
                                    <p>{post.dateDisplay}</p>
                                    <p>{post.title}</p>
                                    <p>{post.summary}</p>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    {featuredPosts.length ? (
                        <>
                            <h3>Featured Articles</h3>
                            <div>
                                {featuredPosts.map((post, index, array) => (
                                    <React.Fragment key={post.slug}>
                                        <div>
                                            <div>
                                                <Link to={post.slug} prefetch="intent">
                                                    {post.title}
                                                </Link>
                                            </div>
                                        </div>
                                        {index !== array.length - 1 && <hr />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </main>
    )
}
