import { Feed } from 'feed'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getPagesList } from '~/lib/mdx.server'
import { conferenceConfig } from '../config/conference-config'

export async function loader() {
    const blogUrl = `https://dddperth.com/blog`
    const posts = await getPagesList('blog')

    const feed = new Feed({
        id: blogUrl,
        title: conferenceConfig.name + ' Blog',
        description: conferenceConfig.blogDescription,
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
