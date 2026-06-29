import type { DateTime } from 'luxon'
import { conferenceManifest } from '@conference/manifest'
import { AppLink } from '~/components/app-link'
import type { ConferenceState, Year } from '~/lib/conference-state-client-safe'
import type { ImportantDate } from '~/lib/important-dates'
import { useMdxPage } from '~/lib/mdx'
import type { ResolvedSponsors } from '~/lib/sponsor-fallback.server'
import { Box, Flex } from '~/styled-system/jsx'
import { ImportantDates, Workshops } from '../page-components/important-dates'
import { HeaderContainer } from '../page-layout'
import { HomepageHeroPanel } from './hero-panel'
import { HeroSponsorStrip } from './hero-sponsor-strip'

export function Hero({
    currentDate,
    conferenceDate,
    importantDates,
    sponsors,
    currentYear,
    conferenceState,
}: {
    currentDate: DateTime
    conferenceDate: string | undefined
    importantDates: ImportantDate[]
    sponsors: ResolvedSponsors
    currentYear: Year
    conferenceState: ConferenceState
}) {
    return (
        <Box overflowX="hidden" position="relative">
            <HomepageHeroPanel conferenceDate={conferenceDate} />
            <Box
                position="relative"
                zIndex="docked"
                /*
                 * The parallax Ds bleed down behind this section. They self-
                 * fade via a mask in hero-panel.tsx, so this overlay only
                 * needs to put a soft body-colour wash behind the intro
                 * paragraph (so any remaining D tint is subtle), then go
                 * solid further down where the dates list lives.
                 */
                css={{
                    bgImage:
                        'linear-gradient(to bottom, transparent 0, color-mix(in srgb, var(--colors-surface\\.body) 50%, transparent) 60px, var(--colors-surface\\.body) 260px, var(--colors-surface\\.body) 100%)',
                }}
            >
                <HeaderContainer>
                    <Flex flexDirection="column" gap="12">
                        <Flex
                            className={`paragraph-wrapper`}
                            direction="column"
                            fontSize={{ base: 'lg', md: 'xl' }}
                            fontWeight="medium"
                            color="text.primary"
                            gap="4"
                            pt="6"
                            maxWidth="4xl"
                        >
                            <HeroBlurb conferenceState={conferenceState} />
                            <p>
                                <AppLink
                                    to="/about"
                                    color="text.highlight"
                                    textDecoration="underline"
                                    textUnderlineOffset="[6px]"
                                    _hover={{ color: 'brand.primary' }}
                                >
                                    Read more about {conferenceManifest.public.name} →
                                </AppLink>
                            </p>
                        </Flex>

                        <ImportantDates currentDate={currentDate} importantDates={importantDates} />
                        <Workshops />
                        <HeroSponsorStrip sponsors={sponsors} currentYear={currentYear} />
                    </Flex>
                </HeaderContainer>
            </Box>
        </Box>
    )
}

/**
 * The hero's lead paragraph. When the fork sets
 * `manifest.homepage.heroBlurbSlug`, the corresponding MDX file renders here.
 * Otherwise we fall back to a one-line description from
 * `manifest.public.description` — bland enough not to misrepresent any
 * conference, specific enough to fill the slot.
 */
function HeroBlurb({ conferenceState }: { conferenceState: ConferenceState }) {
    const slug = conferenceManifest.homepage?.heroBlurbSlug
    if (!slug) {
        return <p>{conferenceManifest.public.description}</p>
    }
    return <HeroBlurbMdx slug={slug} conferenceState={conferenceState} />
}

function HeroBlurbMdx({ slug, conferenceState }: { slug: string; conferenceState: ConferenceState }) {
    const Body = useMdxPage(slug, 'page', conferenceState)
    return <Body />
}
