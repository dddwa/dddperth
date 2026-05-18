import type { DateTime } from 'luxon'
import { AppLink } from '~/components/app-link'
import type { ImportantDate } from '~/lib/important-dates'
import { Box, Flex } from '~/styled-system/jsx'
import { ImportantDates, Workshops } from '../page-components/important-dates'
import { HeaderContainer } from '../page-layout'
import { HomepageHeroPanel } from './hero-panel'

export function Hero({
    currentDate,
    conferenceDate,
    importantDates,
}: {
    currentDate: DateTime
    conferenceDate: string | undefined
    importantDates: ImportantDate[]
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
                            fontSize={{ base: 'xl', md: '2xl' }}
                            fontWeight="medium"
                            color="text.primary"
                            gap="4"
                            pt="6"
                            maxWidth="3xl"
                        >
                            <p>
                                Perth’s largest community-run tech conference. Held on a Saturday and built to be
                                approachable, inclusive, and welcoming, especially for people who don’t usually attend
                                or speak at conferences.
                            </p>
                            <p>
                                <AppLink
                                    to="/about"
                                    color="text.highlight"
                                    textDecoration="underline"
                                    textUnderlineOffset="[6px]"
                                    _hover={{ color: 'brand.primary' }}
                                >
                                    Read more about DDD →
                                </AppLink>
                            </p>
                        </Flex>

                        <ImportantDates currentDate={currentDate} importantDates={importantDates} />
                        <Workshops />
                    </Flex>
                </HeaderContainer>
            </Box>
        </Box>
    )
}
