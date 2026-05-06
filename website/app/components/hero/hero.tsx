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
                bgImage="[linear-gradient(to bottom, rgba(14, 14, 67, 0) 0, rgba(14, 14, 67, 0.45) 80px, rgba(14, 14, 67, 0.45) 100%)]"
            >
                <HeaderContainer>
                    <Flex flexDirection="column" gap="12">
                        <Flex
                            className={`paragraph-wrapper`}
                            direction="column"
                            fontSize={{ base: 'xl', md: '2xl' }}
                            fontWeight="medium"
                            color="white"
                            gap="4"
                            pt="6"
                            maxWidth="3xl"
                            textShadow="[0 1px 12px rgba(0, 0, 0, 0.85)]"
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
                                    _hover={{ color: 'text.on-brand' }}
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
