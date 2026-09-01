import { conferenceManifest } from '@conference/manifest'
import { useRef } from 'react'
import { data, useLoaderData } from 'react-router'
import invariant from 'tiny-invariant'
import type { BlogAuthor } from '~/lib/authors.server'
import { ContentPageLayout } from '~/components/page-layout'
import { getAuthor, getValidAuthorNames } from '~/lib/authors.server'
import { CACHE_CONTROL } from '~/lib/http.server'
import { useMdxPage } from '~/lib/mdx'
import { getConferenceState, getServices } from '~/remix-app-load-context'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { prose } from '~/styled-system/recipes'
import type { Route } from './+types/_layout.blog.$slug'

export async function loader({ params, request, context }: Route.LoaderArgs) {
    const { slug } = params
    invariant(!!slug, 'Expected slug param')
    const requestUrl = new URL(request.url)
    const siteUrl = requestUrl.protocol + '//' + requestUrl.host

    const post = await getServices(context).content.getPage(slug, 'blog')
    if (!post) {
        throw new Response('Not Found', { status: 404, statusText: 'Not Found' })
    }

    return data(
        {
            siteUrl,
            frontmatter: post.frontmatter,
            slug: post.slug,
            conferenceState: getConferenceState(context),
            blogAuthors: getValidAuthorNames(post.frontmatter.authors ?? [])
                .map(getAuthor)
                .filter((a): a is BlogAuthor => !!a),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export function headers({ loaderHeaders }: Route.HeadersArgs) {
    // Inherit the caching headers from the loader so we do't cache 404s
    return loaderHeaders
}

export function meta(args: Route.MetaArgs) {
    const { loaderData: data, params } = args
    const { slug } = params
    invariant(!!slug, 'Expected slug param')

    const { siteUrl, frontmatter } = data || {}
    if (!frontmatter) {
        return [{ title: `404 Not Found | ${conferenceManifest.public.name}` }]
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
    const twitterHandle = conferenceManifest.socials.Twitter?.Name

    return [
        { title: `${frontmatter.title} | ${conferenceManifest.public.name}` },
        { name: 'description', content: frontmatter.summary },
        { property: 'og:url', content: url },
        { property: 'og:title', content: frontmatter.title },
        { property: 'og:image', content: socialImageUrl },
        { property: 'og:description', content: frontmatter.summary },
        { name: 'twitter:card', content: 'summary_large_image' },
        ...(twitterHandle
            ? [
                  { name: 'twitter:creator', content: `@${twitterHandle}` },
                  { name: 'twitter:site', content: `@${twitterHandle}` },
              ]
            : []),
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
    const { slug, frontmatter, blogAuthors, conferenceState } = useLoaderData<typeof loader>()
    const mdRef = useRef<HTMLDivElement>(null)
    const Component = useMdxPage(slug, 'blog', conferenceState)

    return (
        <ContentPageLayout>
            {frontmatter.draft ? (
                <Box
                    bg="status.warning.bg"
                    color="status.warning.fg"
                    borderWidth="1px"
                    borderColor="status.warning.border"
                    p="4"
                    mb="6"
                    rounded="md"
                >
                    🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨
                </Box>
            ) : null}
            <styled.article maxW="4xl" mx="auto" color="text.primary">
                {frontmatter.image ? (
                    <styled.img
                        src={frontmatter.image}
                        alt={frontmatter.imageAlt ?? ''}
                        width="full"
                        maxH="[32rem]"
                        objectFit="cover"
                        rounded="xl"
                        mb="6"
                    />
                ) : null}

                {/* The post title is the page's heading — it was a bare div,
                    leaving blog posts with no heading-level entry point. */}
                <styled.h1 fontSize={{ base: '3xl', md: '4xl' }} lineHeight="tight" mb="5">
                    {frontmatter.title}
                </styled.h1>

                {blogAuthors.length > 0 ? (
                    <Flex gap="5" flexWrap="wrap" mb="8">
                        {blogAuthors.map((author) => (
                            <Flex key={author.name} alignItems="center" gap="3">
                                <styled.img
                                    src={author.avatar}
                                    alt=""
                                    width="12"
                                    height="12"
                                    objectFit="cover"
                                    rounded="full"
                                />
                                <Box>
                                    <styled.p fontWeight="semibold">{author.name}</styled.p>
                                    <styled.p color="text.muted" fontSize="sm">
                                        {author.title}
                                    </styled.p>
                                </Box>
                            </Flex>
                        ))}
                    </Flex>
                ) : null}

                <Box ref={mdRef} className={prose({ size: 'lg' })}>
                    <Component />
                </Box>
            </styled.article>
        </ContentPageLayout>
    )
}
