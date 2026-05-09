import { Feed } from 'feed'
import { conferenceConfigPublic } from '@ddd/conference-config/public'
import { CACHE_CONTROL } from '~/lib/http.server'
import type { Route } from './+types/blog.rss[.xml]'

export async function loader({ context }: Route.LoaderArgs) {
    const blogUrl = `https://dddperth.com/blog`
    const posts = await context.services.content.getPagesList('blog')

    const feed = new Feed({
        id: blogUrl,
        title: conferenceConfigPublic.name + ' Blog',
        description: conferenceConfigPublic.blogDescription,
        link: blogUrl,
        language: 'en',
        updated: posts.length > 0 && posts[0].date ? new Date(posts[0].date) : new Date(),
        generator: 'https://github.com/jpmonette/feed',
        copyright: '© DDD Perth',
    })

    posts.forEach((post) => {
        const postLink = `${blogUrl}/${post.slug}`
        feed.addItem({
            id: postLink,
            title: post.title,
            link: postLink,
            date: posts[0].date ? new Date(posts[0].date) : new Date(),
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
