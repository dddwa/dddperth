import { conferenceManifest } from '@conference/manifest'
import { Feed } from 'feed'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getServices } from '~/remix-app-load-context'
import type { Route } from './+types/blog.rss[.xml]'

export async function loader({ context }: Route.LoaderArgs) {
    const blogUrl = `https://${conferenceManifest.brand.domain}/blog`
    const posts = await getServices(context).content.getPagesList('blog')

    const feed = new Feed({
        id: blogUrl,
        title: conferenceManifest.public.name + ' Blog',
        description: conferenceManifest.public.blogDescription,
        link: blogUrl,
        language: 'en',
        // eslint-disable-next-line dates/use-date-time-provider -- RSS metadata uses real time, independently of conference overrides.
        updated: posts.length > 0 && posts[0].date ? new Date(posts[0].date) : new Date(),
        generator: 'https://github.com/jpmonette/feed',
        copyright: `© ${conferenceManifest.brand.legalName}`,
    })

    posts.forEach((post) => {
        const postLink = `${blogUrl}/${post.slug}`
        feed.addItem({
            id: postLink,
            title: post.title,
            link: postLink,
            // eslint-disable-next-line dates/use-date-time-provider -- RSS metadata uses real time, independently of conference overrides.
            date: post.date ? new Date(post.date) : new Date(),
            description: post.summary,
        })
    })

    return new Response(feed.rss2(), {
        headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': CACHE_CONTROL.DEFAULT,
        },
    })
}
