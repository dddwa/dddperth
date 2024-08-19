/* eslint-disable @typescript-eslint/no-unused-vars */
import type { HeadersFunction, LoaderFunctionArgs, SerializeFrom } from '@remix-run/node'
import { json } from '@remix-run/node'
import type { MetaFunction } from '@remix-run/react'
import { useLoaderData } from '@remix-run/react'

import { trace } from '@opentelemetry/api'
import { PropsWithChildren } from 'react'
import { prose } from 'styled-system/recipes'
import ImportantDates from '~/components/page-components/important-dates'
import { Button } from '~/components/ui/button'
import getConferenceActions from '~/lib/conference-actions'
import { ConferenceState } from '~/lib/config-types'
import { CACHE_CONTROL } from '~/lib/http.server'
import { css } from '../../styled-system/css'
import { Box, Flex, Grid, styled } from '../../styled-system/jsx'
import { conferenceConfig } from '../config/conference-config'
import { socials } from '../config/socials'
import { useMdxPage } from '../lib/mdx'
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

  const siteUrl = requestUrl.protocol + '//' + requestUrl.host

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
  const currentPath = requestUrl.pathname

  return json(
    {
      currentPath,
      siteUrl,
      frontmatter: post.frontmatter,
      post: post.code,
      conferenceState: context.conferenceState,
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
  const contentSlug = params['*']
  if (!contentSlug) {
    throw new Error('Expected contentSlug param')
  }

  const { siteUrl, post, frontmatter } = data || {}
  if (!post || !frontmatter) {
    return [{ title: `404 Not Found | ${conferenceConfig.name}` }]
  }

  const ogImageUrl = siteUrl ? new URL(`${siteUrl}/img/${contentSlug}`) : null
  if (ogImageUrl && frontmatter.title) {
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

export default function WebsiteContentPage() {
  const { post, frontmatter, currentPath, conferenceState, siteUrl } = useLoaderData<typeof loader>()
  const Component = useMdxPage(post, conferenceState)

  return (
    <>
      {frontmatter.draft ? (
        <div>🚨 This is a draft, please do not share this page until it&apos;s officially published 🚨</div>
      ) : null}
      <div>
        <Flex
          position="relative"
          bgGradient="to-b"
          gradientFrom="#070727"
          gradientToPosition="99%"
          gradientTo="#0E0E43"
          w="100%"
          color="white"
        >
          <Box w="100%" position="relative" maxW="1200px" m="0 auto" md={{ p: '4' }}>
            <ContentPageWithSidebar
              currentPath={currentPath}
              frontmatter={frontmatter}
              conferenceState={conferenceState}
            >
              <Component />
            </ContentPageWithSidebar>
          </Box>
        </Flex>
      </div>
    </>
  )
}

export const styledSidebarContainer = css({})

function ContentPageWithSidebar({
  frontmatter,
  currentPath,
  conferenceState,
  children,
}: PropsWithChildren<Pick<SerializeFrom<typeof loader>, 'conferenceState' | 'frontmatter' | 'currentPath'>>) {
  return (
    <Grid gridTemplateColumns="1fr auto">
      <main id="content">
        <styled.h1 fontSize="3xl">{frontmatter.title}</styled.h1>
        <Box className={prose({ size: 'lg' })}>{children}</Box>
      </main>
      <Flex
        flexDirection="column"
        height="fit-content"
        bgGradient="to-r"
        gradientFrom="#1F1F4E"
        gradientTo="#151544"
        shadow="md"
        p={4}
        rounded="xl"
      >
        {/* <EventDetailsSummary conferenceState={conferenceState} currentPath={currentPath} /> */}

        <ImportantDates smallSidebar={true} showOnlyLive={true} />

        {/* TODO Important date list */}
        {/* <ImportantDatesList layout="inline" conference={conference} currentDate={currentDate} /> */}
      </Flex>
    </Grid>
  )
}

export interface EventDetailsSummaryProps {
  conferenceState: SerializeFrom<ConferenceState>
  currentPath: string
  className?: string
}

export const EventDetailsSummary = ({ className, conferenceState, currentPath }: EventDetailsSummaryProps) => {
  const [primaryCta] = getConferenceActions(conferenceState).filter((a) => a.url !== currentPath)

  const relevantDate = conferenceState.conference.date

  return (
    <div className={className}>
      {relevantDate ? (
        <h2>
          <small style={{ display: 'block' }}>
            {conferenceState.conferenceState === 'before-conference' ? 'Next event' : 'Previous event'}
          </small>
          <time>{new Date(relevantDate).toDateString()}</time>
        </h2>
      ) : null}
      <ul
        className={css({
          paddingLeft: 'md',
          marginBottom: 'lg',
          marginLeft: 'lg',

          '&li': {
            paddingLeft: 'xs',
            fill: '2023-pink',
            listStyleImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M0 0h6v6H0z'/%3E%3C/svg%3E")`,
            listStyleType: 'none',
          },
        })}
      >
        {conferenceState.ticketSales === 'sold-out' && (
          <li>
            <strong>SOLD OUT</strong>
          </li>
        )}
        {conferenceState.ticketSales === 'wait-list-open' && (
          <li>
            <strong>WAITLIST OPEN</strong>
          </li>
        )}
        {/* {conference.SellingPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                ))} */}
        <styled.li fontSize="xl" fontWeight="semibold">
          Only {conferenceState.conference.ticketPrice}
        </styled.li>
      </ul>
      {primaryCta && (
        <div style={{ textAlign: 'center' }}>
          <Button asChild>
            <styled.a
              href={primaryCta.url}
              color="#520030"
              _hover={{ gradientTo: '#FF52B7' }}
              bgGradient="to-r"
              gradientFrom="#FF52B7"
              gradientTo="#FF8273"
              fontWeight={600}
              borderRightRadius={100}
              py={2}
              px={4}
            >
              {primaryCta.title} ↗
            </styled.a>
          </Button>
        </div>
      )}
    </div>
  )
}
