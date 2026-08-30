import { conferenceManifest } from '@conference/manifest'
import * as React from 'react'
import { data, Link, useLoaderData } from 'react-router'
import { ContentPageLayout } from '~/components/page-layout'
import { CACHE_CONTROL } from '~/lib/http.server'
import { getServices } from '~/remix-app-load-context'
import { Box, Grid, styled } from '~/styled-system/jsx'
import type { Route } from './+types/_layout.blog._index'

export async function loader({ context }: Route.LoaderArgs) {
    return data(
        {
            conferenceName: conferenceManifest.public.name,
            blogDescription: conferenceManifest.public.blogDescription,
            posts: await getServices(context).content.getPagesList('blog'),
        },
        { headers: { 'Cache-Control': CACHE_CONTROL.DEFAULT } },
    )
}

export function meta({ loaderData }: Route.MetaArgs) {
    return [
        { title: loaderData.conferenceName + ' Blog' },
        {
            name: 'description',
            content: loaderData.blogDescription,
        },
    ]
}

export default function Blog() {
    const data = useLoaderData<typeof loader>()
    const [latestPost, ...posts] = data.posts

    const featuredPosts = data.posts.filter((post) => post.featured)

    return (
        // No <main> here — `_layout.tsx` already provides the page's single
        // `<main id="main">` landmark; a nested <main> would be invalid and
        // would confuse the skip-to-content target.
        <ContentPageLayout>
            <styled.section color="text.primary">
                <styled.h1 fontSize={{ base: '3xl', md: '4xl' }} mb="8">
                    {data.conferenceName} Blog
                </styled.h1>

                <BlogPostLink to={latestPost.slug} prefetch="intent" mb="8" p={{ base: '5', md: '7' }}>
                    {latestPost.image ? (
                        <styled.img
                            src={latestPost.image}
                            alt={latestPost.imageAlt ?? ''}
                            width="full"
                            maxH="[28rem]"
                            objectFit="cover"
                            rounded="lg"
                            mb="5"
                        />
                    ) : null}
                    <PostSummary post={latestPost} titleSize="2xl" />
                </BlogPostLink>

                {posts.length > 0 ? (
                    <Grid gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap="6">
                        {posts.map((post) => (
                            <BlogPostLink key={post.slug} to={post.slug} prefetch="intent" p="5">
                                {post.image ? (
                                    <styled.img
                                        src={post.image}
                                        alt={post.imageAlt ?? ''}
                                        width="full"
                                        aspectRatio="[16/9]"
                                        objectFit="cover"
                                        rounded="md"
                                        mb="4"
                                    />
                                ) : null}
                                <PostSummary post={post} titleSize="xl" />
                            </BlogPostLink>
                        ))}
                    </Grid>
                ) : null}

                {featuredPosts.length ? (
                    <Box mt="12">
                        <styled.h2 fontSize="2xl" mb="4">
                            Featured Articles
                        </styled.h2>
                        <Box bg="surface.card" rounded="xl" shadow="md" overflow="hidden">
                            {featuredPosts.map((post, index, array) => (
                                <React.Fragment key={post.slug}>
                                    <FeaturedLink to={post.slug} prefetch="intent">
                                        {post.title}
                                    </FeaturedLink>
                                    {index !== array.length - 1 && <hr />}
                                </React.Fragment>
                            ))}
                        </Box>
                    </Box>
                ) : null}
            </styled.section>
        </ContentPageLayout>
    )
}

const BlogPostLink = styled(Link, {
    base: {
        display: 'block',
        color: 'text.primary',
        bg: 'surface.card',
        borderWidth: '1px',
        borderColor: 'border.subtle',
        rounded: 'xl',
        shadow: 'md',
        textDecoration: 'none',
        transition: 'all',
        _hover: { borderColor: 'border.emphasis', transform: 'translateY(-2px)', shadow: 'lg' },
        _focusVisible: { outline: '[3px solid token(colors.interactive.focus)]', outlineOffset: '[3px]' },
    },
})

const FeaturedLink = styled(Link, {
    base: {
        display: 'block',
        color: 'text.primary',
        p: '4',
        fontWeight: 'semibold',
        _hover: { color: 'text.highlight' },
        _focusVisible: { outline: '[3px solid token(colors.interactive.focus)]', outlineOffset: '[-3px]' },
    },
})

function PostSummary({
    post,
    titleSize,
}: {
    post: { dateDisplay?: string; title: string; summary?: string }
    titleSize: 'xl' | '2xl'
}) {
    return (
        <>
            {post.dateDisplay ? (
                <styled.p color="text.muted" fontSize="sm" mb="2">
                    {post.dateDisplay}
                </styled.p>
            ) : null}
            <styled.h2 fontSize={titleSize} lineHeight="tight">
                {post.title}
            </styled.h2>
            {post.summary ? (
                <styled.p color="text.secondary" mt="3">
                    {post.summary}
                </styled.p>
            ) : null}
        </>
    )
}
