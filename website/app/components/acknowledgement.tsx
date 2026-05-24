import { conferenceManifest } from '@conference/manifest'
import AboriginalLogo from '~/images/svg/aboriginal_ddd.svg?react'
import type { ConferenceState } from '~/lib/conference-state-client-safe'
import { useMdxPage } from '~/lib/mdx'
import { Box, Divider, Flex } from '~/styled-system/jsx'

/**
 * Country / land acknowledgement rendered in the site footer.
 *
 * The body is fork-owned MDX, addressed by
 * `conferenceManifest.homepage.acknowledgementSlug`. Without that slug, the
 * section doesn't render — forks in regions without Country acknowledgement
 * conventions can simply omit it.
 *
 * The Aboriginal DDD logo is a DDD Perth asset; non-WA forks supplying their
 * own acknowledgement should remove/replace it (it's just an SVG import from
 * core's images folder, so the fix is on the core image rather than per-fork).
 */
export function Acknowledgement({ conferenceState }: { conferenceState?: ConferenceState }) {
    const slug = conferenceManifest.homepage?.acknowledgementSlug
    // We need conferenceState to render the MDX with the right context.
    // Error boundary renders Acknowledgement without it — skip there.
    if (!slug || !conferenceState) return null
    return <AcknowledgementBody slug={slug} conferenceState={conferenceState} />
}

function AcknowledgementBody({ slug, conferenceState }: { slug: string; conferenceState: ConferenceState }) {
    const Body = useMdxPage(slug, 'page', conferenceState)
    return (
        <Box pt="12" pb={{ base: '12', md: '24' }} bgGradient="to-b" mx="5" color="text.primary">
            <Flex direction="column" gap="6" maxW="breakpoint-2xl" mx="auto">
                <Divider color="border.subtle" mb="6" />
                <AboriginalLogo width={58} />
                <Body />
            </Flex>
        </Box>
    )
}
