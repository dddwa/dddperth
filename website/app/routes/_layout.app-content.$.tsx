/* eslint-disable @typescript-eslint/no-unused-vars */
import type { HeadersFunction, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'

import { trace } from '@opentelemetry/api'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getPage } from '../lib/mdx.server'

export async function loader({ params, request, context }: LoaderFunctionArgs) {
    const contentSlug = params['*']
    if (!contentSlug) {
        throw new Error('Expected contentSlug param')
    }

    const requestUrl = new URL(request.url)
    if (requestUrl.pathname.startsWith('/static')) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    const post = await getPage(contentSlug, 'page')
    if (!post) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (post.frontmatter.draft) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }
    if (!post.frontmatter.title) {
        trace.getActiveSpan()?.recordException(new Error(`Missing title in frontmatter for ${contentSlug}`))
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    return json(
        {
            frontmatter: post.frontmatter,
            post: post.code,
            conferenceState: context.conferenceState,
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.doc } },
    )
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
    // Inherit the caching headers from the loader so we don't cache 404s
    return loaderHeaders
}
