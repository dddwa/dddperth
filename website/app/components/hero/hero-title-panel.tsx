import { Box, Flex, styled } from '~/styled-system/jsx'
import { ctaButton } from '../../recipes/button'

export function HeroTitlePanel() {
    return (
        <Box className={`homepage-title-panel`} w="100%" position="relative" color="white" zIndex="2">
            <Box className={`container-wrapper`} w="100%" maxW="1200px" mx="auto">
                <Box
                    className={`padding-wrapper`}
                    w="100%"
                    px="6"
                    py="8"
                    sm={{ px: '8', py: '10' }}
                    lg={{ px: '10', py: '12' }}
                    xl={{ px: '12', py: '16' }}
                >
                    <Box
                        className={`content-wrapper`}
                        w="100%"
                        display="flex"
                        flexDir="column"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        sm={{ justifyContent: 'center', alignItems: 'center' }}
                    >
                        <Flex
                            className={`paragraph-wrapper`}
                            w="100%"
                            maxWidth="3/5"
                            direction="column"
                            fontSize="2xl"
                            fontWeight="medium"
                            gap={6}
                        >
                            <p>
                                DDD Perth is Perth's largest community run conference for the tech community. Our goal
                                is to create an approachable event that appeals to the whole community, especially
                                people that don't normally get to attend or speak at conferences. The conference is run
                                on a Saturday, and strives to be inclusive of everyone in the Perth tech community.
                            </p>
                            <p>
                                DDD Perth started out its life as part of the Developer! Developer! Developer! series of
                                events and while our heritage is as a developer-focussed conference, DDD Perth is not
                                just for developers, but for all professionals in the software industry. These days we
                                don't expand DDD - it's not an acronym for us anymore, but if people insist then we
                                might say Designer, Developer and Data Scientist, or is it DevOps, Data architect,
                                distributed tester?
                            </p>
                            <p>
                                Check out the agenda and talks from previous years , or hear more about how we do what
                                we do on our blog.
                            </p>
                        </Flex>
                        <Box
                            className={`buttons-wrapper`}
                            w="100%"
                            display="flex"
                            flexDir="column"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                            mt="6"
                            gap="4"
                            sm={{ flexDir: 'row', justifyContent: 'center', alignItems: 'center', mt: '8' }}
                            lg={{ mt: '10' }}
                        >
                            <styled.a
                                href="/buy-tickets"
                                className={`${ctaButton({ visual: 'primary', size: 'lg', width: 'full' })}`}
                            >
                                Buy tickets
                            </styled.a>
                            <styled.a
                                href="/submit-presentation"
                                className={`${ctaButton({ visual: 'secondary', size: 'lg', width: 'full' })}`}
                            >
                                Submit presentation
                            </styled.a>
                        </Box>
                    </Box>
                </Box>
            </Box>
        </Box>
    )
}
