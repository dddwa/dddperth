import WaveDecoration from '~/images/svg/orange-wave-decoration.svg?react'
import { css } from '../../../styled-system/css'
import { Box, styled } from '../../../styled-system/jsx'
import { ctaButton } from '../../recipes/button'
import { AppLink } from '../app-link'
import CircleDateModule from './circle-date'

export function HeroTitlePanel() {
    return (
        <Box className={`homepage-title-panel`} w="100%" position="relative" bg="2023-white-i" zIndex="2">
            <Box className={`background-decorations`} w="100%" position="absolute" inset="0" pointerEvents="none">
                <WaveDecoration
                    className={css({
                        display: 'none',
                        position: 'absolute',
                        lg: { display: 'block', w: '32', top: '12', left: '-8' },
                        xl: { w: '64' },
                    })}
                />
            </Box>
            <Box
                className={css({
                    xs: { w: '40', h: '40', top: '-7.5rem', right: '0' },
                    sm: { w: '40', h: '40', top: '-7.5rem', right: '-4' },
                    md: { w: '40', h: '40', top: '-7.5rem', right: '10' },
                    lg: { w: '64', h: '64', top: '-48', right: '-4' },
                    xl: { w: '64', h: '64', top: '-48', right: '16' },
                })}
                position="absolute"
                w="32"
                h="32"
                right="-1.75rem"
                top="-24"
            >
                <CircleDateModule />
            </Box>
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
                        <styled.h1
                            fontFamily="display"
                            fontSize="xl"
                            fontWeight="bold"
                            maxW="18rem"
                            sm={{ textAlign: 'center', fontSize: '2xl', maxW: '32rem' }}
                            lg={{ fontSize: '3xl', maxW: '40rem' }}
                            xl={{ fontSize: '4xl', maxW: '52rem' }}
                        >
                            <styled.span color="2023-black">
                                A one day, fully inclusive, approachable and affordable tech conference for{' '}
                            </styled.span>
                            <styled.span color="2023-accessible-orange">everyone.</styled.span>
                        </styled.h1>
                        <Box
                            className={`paragraph-wrapper`}
                            w="100%"
                            display="flex"
                            flexDir="column"
                            justifyContent="flex-start"
                            alignItems="flex-start"
                            mt="6"
                            sm={{ mt: '8', textAlign: 'center', justifyContent: 'center', alignItems: 'center' }}
                            lg={{ mt: '10', fontSize: 'lg', maxW: '62rem' }}
                        >
                            <p>
                                DDD Perth is Perth&quot;s largest community run conference for the tech community. Our
                                goal is to create an inclusive, approachable event that appeals to everyone, especially
                                people that don&quot;t normally get to attend or speak at conferences.
                            </p>
                            <styled.p mt="4" lg={{ mt: '6' }}>
                                Check out the agenda and talks from previous years, or hear more about how we do what we
                                do on our <AppLink to="./">blog</AppLink>.
                            </styled.p>
                        </Box>
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
