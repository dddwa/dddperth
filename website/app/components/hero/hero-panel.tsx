import { easeOut, motion, useScroll, useTransform } from 'framer-motion'
import { DateTime } from 'luxon'
import { useEffect, useState } from 'react'
import { conferenceConfigPublic } from '@ddd/conference-config/public'
import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { HeaderContainer } from '../page-layout'

// Reference viewport width that the parallax distances were tuned for.
// Below this, distances scale down linearly so the Ds don't slide past each other on narrow screens.
const PARALLAX_REFERENCE_WIDTH = 1280

// Vertical fade applied to each parallax D so the bottom of the SVG dissolves
// into whatever surface sits beneath it. The Ds are taller than the panel and
// drift further on scroll, so without this they'd hard-edge onto the body.
const DRIFT_MASK = {
    maskImage: 'linear-gradient(to bottom, black 0, black 55%, transparent 95%)',
    WebkitMaskImage: 'linear-gradient(to bottom, black 0, black 55%, transparent 95%)',
} as const

export function HomepageHeroPanel({ conferenceDate }: { conferenceDate: string | undefined }) {
    const { scrollY } = useScroll()
    const parallaxScale = useParallaxScale()

    // Extend parallax travel so the Ds keep moving as you scroll past the panel
    // and slide down behind the intro paragraph. Distances are intentionally subtle
    // so it reads as a gentle drift rather than a strong parallax.
    // Floor distances ensure motion stays visible at narrow widths where parallaxScale shrinks.
    const y2 = useTransform(scrollY, [0, 600], [0, Math.max(140 * parallaxScale, 160)], { ease: easeOut })
    const y3 = useTransform(scrollY, [0, 600], [0, Math.max(260 * parallaxScale, 260)], { ease: easeOut })

    return (
        <Flex
            height="auto"
            direction="column"
            alignItems="center"
            width="full"
            gradientFrom="gradient.hero-start"
            gradientTo="gradient.hero-end"
            gap="6"
            pt={{ base: '0', xl: '24' }}
            bgGradient="to-b"
            md={{ gap: '8' }}
            lg={{ gap: '12' }}
            xl={{
                gap: '24',
            }}
        >
            <HeaderContainer>
                {conferenceDate ? (
                    <styled.h2
                        color="text.highlight"
                        fontSize={{ base: 'md', md: 'xl' }}
                        fontWeight={{ base: 'medium', md: 'semibold' }}
                        display="flex"
                        flexDirection={{ base: 'column', xs: 'row' }}
                        justifyContent="space-between"
                        gap={{ base: '1', xs: '4' }}
                        width="full"
                    >
                        <styled.span>
                            {DateTime.fromISO(conferenceDate, {
                                zone: conferenceConfigPublic.timezone,
                            }).toLocaleString(DateTime.DATE_HUGE, {
                                locale: 'en-AU',
                            })}
                        </styled.span>
                        <styled.span>Optus Stadium, Perth</styled.span>
                    </styled.h2>
                ) : null}
                <styled.h1
                    fontFamily="display"
                    color="text.primary"
                    w="full"
                    fontWeight="black"
                    textWrap="balance"
                    lineHeight="[1.2]"
                    fontSize={{ base: '2xl', md: '3xl', xl: '5xl' }}
                    maxWidth={{ base: 'full', xl: '3/4' }}
                >
                    A one day, fully inclusive, approachable and affordable tech conference for everyone.
                </styled.h1>
            </HeaderContainer>
            <Box width="full" position="relative" maxHeight={{ base: '[140px]', md: '[200px]', lg: '[260px]', xl: '[420px]' }}>
                {/* Sizing element: the green D establishes the container height.
                    Other Ds and the gradient overlay are absolutely positioned over it. */}
                <Box width="[38%]" ml="[4%]" visibility="hidden" aria-hidden="true">
                    <DGreen style={{ width: '100%', height: 'auto' }} />
                </Box>
                <Box
                    position="absolute"
                    zIndex="base"
                    bottom="0"
                    bgGradient="to-b"
                    gradientFrom="transparent"
                    gradientTo="gradient.hero-end"
                    width="full"
                    height="[60%]"
                ></Box>
                {/*
                 * Each parallax D carries a vertical fade mask + opacity so
                 * its lower edge dissolves into whatever surface sits below.
                 * The mask + opacity are applied directly to the motion.div
                 * (framer-motion preserves these style keys) so they travel
                 * with the SVG as it translates on scroll.
                 */}
                <motion.div style={{ position: 'absolute', top: '0', left: '4%', zIndex: 2, width: '38%', opacity: 0.7, ...DRIFT_MASK }}>
                    <DGreen style={{ width: '100%', height: 'auto' }} />
                </motion.div>
                <motion.div
                    style={{
                        position: 'absolute',
                        top: '0',
                        marginTop: '20px',
                        left: '30%',
                        zIndex: 1,
                        y: y2,
                        width: '38%',
                        opacity: 0.7,
                        ...DRIFT_MASK,
                    }}
                >
                    <DPink style={{ width: '100%', height: 'auto' }} />
                </motion.div>
                <motion.div
                    style={{
                        position: 'absolute',
                        top: '0',
                        marginTop: '40px',
                        left: '56%',
                        transform: 'translateX(-50%)',
                        y: y3,
                        width: '38%',
                        opacity: 0.7,
                        ...DRIFT_MASK,
                    }}
                >
                    <DPurple style={{ width: '100%', height: 'auto' }} />
                </motion.div>
            </Box>
        </Flex>
    )
}

function useParallaxScale() {
    // Start at 1 so SSR + first paint match the desktop look; refine on mount.
    const [scale, setScale] = useState(1)

    useEffect(() => {
        const update = () => {
            const width = window.innerWidth
            // Linear ramp: <=400px → 0.25, >=1280px → 1, smoothly between.
            const minWidth = 400
            const minScale = 0.25
            if (width >= PARALLAX_REFERENCE_WIDTH) {
                setScale(1)
            } else if (width <= minWidth) {
                setScale(minScale)
            } else {
                const t = (width - minWidth) / (PARALLAX_REFERENCE_WIDTH - minWidth)
                setScale(minScale + t * (1 - minScale))
            }
        }

        update()
        window.addEventListener('resize', update)
        return () => window.removeEventListener('resize', update)
    }, [])

    return scale
}
