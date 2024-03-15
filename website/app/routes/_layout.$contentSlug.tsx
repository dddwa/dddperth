/* eslint-disable @typescript-eslint/no-unused-vars */
import type { HeadersFunction, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { MetaFunction } from '@remix-run/react'
import { useLoaderData } from '@remix-run/react'
import invariant from 'tiny-invariant'

import { renderToStaticMarkup } from 'react-dom/server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { Box, styled } from '../../styled-system/jsx'
import { Heading } from '../components/ui/heading'
import { conferenceConfig } from '../config/conference-config'
import { socials } from '../config/socials'
import { getPage } from '../lib/website-content-pages.server'

export async function loader({ params, request }: LoaderFunctionArgs) {
    const { contentSlug } = params
    invariant(!!contentSlug, 'Expected contentSlug param')
    const requestUrl = new URL(request.url)
    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await getPage(contentSlug)
    return json(
        {
            siteUrl,
            frontmatter: post.frontmatter,
            post: renderToStaticMarkup(
                <post.default
                    components={{
                        a: ({ ref, ...props }) => <styled.a {...props} />,
                        h1: ({ ref, ...props }) => <Heading as="h1" fontSize="3xl" {...props} />,
                        h2: ({ ref, ...props }) => <Heading as="h2" fontSize="2xl" {...props} />,
                        h3: ({ ref, ...props }) => <Heading as="h3" fontSize="xl" {...props} />,
                        ul: ({ ref, ...props }) => <styled.ul {...props} listStyle="inside" />,
                    }}
                    conference={conferenceConfig}
                />,
            ),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export const headers: HeadersFunction = ({ loaderHeaders }) => {
    // Inherit the caching headers from the loader so we don't cache 404s
    return loaderHeaders
}

export const meta: MetaFunction<typeof loader> = (args) => {
    const { data, params } = args
    const { contentSlug } = params
    invariant(!!contentSlug, 'Expected contentSlug param')

    const { siteUrl, post, frontmatter } = data || {}
    if (!post) {
        return [{ title: `404 Not Found | ${conferenceConfig.name}` }]
    }

    const ogImageUrl = siteUrl ? new URL(`${siteUrl}/img/${contentSlug}`) : null
    if (ogImageUrl) {
        ogImageUrl.searchParams.set('title', frontmatter.title)
    }

    const socialImageUrl = ogImageUrl?.toString()
    const url = siteUrl ? `${siteUrl}/blog/${contentSlug}` : null

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
        // {
        //     name: 'twitter:image:alt',
        //     // content: socialImageUrl ? post.imageAlt : undefined,
        // },
    ]
}

export default function BlogPost() {
    const { post, frontmatter } = useLoaderData<typeof loader>()

    return (
        <>
            {frontmatter.draft ? (
                <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
            ) : null}
            <div>
                <Box position="relative" bg="white" w="100%" display="flex" zIndex="10">
                    <Box w="100%" position="relative" maxW="1200px" m="0 auto" md={{ p: '4' }}>
                        <Heading as="h1" size="3xl">
                            {frontmatter.title}
                        </Heading>
                        <div dangerouslySetInnerHTML={{ __html: post }} />
                        <hr />
                    </Box>
                </Box>
            </div>
        </>
    )
}
