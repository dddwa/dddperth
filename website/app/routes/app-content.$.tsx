import { CACHE_CONTROL } from '~/lib/http.server'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import type { Route } from './+types/app-content.$'

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const requestUrl = new URL(request.url)
    if (requestUrl.pathname.startsWith('/static')) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const post = await getServices(context).content.getPage(contentSlug, 'page', { includeCode: true })
    if (!post) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (post.frontmatter.draft) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (!post.frontmatter.title) {
        console.error(`Missing title in frontmatter for ${contentSlug}`)
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    return new Response(
        JSON.stringify({
            frontmatter: post.frontmatter,
            post: post.code,
            conferenceState: getConferenceState(context),
        }),
        {
            headers: {
                'Cache-Control': CACHE_CONTROL.doc,
                'Access-Control-Allow-Origin': '*',
            },
        },
    )
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    // Inherit the caching headers from the loader so we don't cache 404s
    return loaderHeaders
}
