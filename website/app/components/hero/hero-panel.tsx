import { easeOut, motion, useScroll, useTransform } from 'framer-motion'
import { DateTime } from 'luxon'
import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex, styled } from '~/styled-system/jsx'
import { HeaderContainer } from '../page-layout'

export function HomepageHeroPanel({ conferenceDate }: { conferenceDate: string | undefined }) {
    const { scrollY } = useScroll()

    const y2 = useTransform(scrollY, [0, 400], [0, 100], { ease: easeOut })
    const y3 = useTransform(scrollY, [0, 400], [0, 200], { ease: easeOut })

    return (
        <Flex
            height="auto"
            overflow="hidden"
            direction="column"
            alignItems="center"
            width="full"
            gradientFrom="#070727"
            gradientTo="#0E0E43"
            gap={6}
            pt={{ base: 6, md: 12, lg: 24 }}
            bgGradient="to-b"
            md={{ gap: '12' }}
            lg={{ gap: '20' }}
            xl={{
                gap: '24',
            }}
        >
            <HeaderContainer>
                {conferenceDate ? (
                    <styled.h2
                        color="#8282FB"
                        fontSize={{ base: 'md', md: 'xl' }}
                        fontWeight={{ base: 'medium', md: 'semibold' }}
                        textWrap="nowrap"
                        maxWidth="3/4"
                    >
                        <styled.span>
                            {DateTime.fromISO(conferenceDate).toLocaleString(DateTime.DATE_HUGE, {
                                locale: 'en-AU',
                            })}
                        </styled.span>
                        <styled.span display="none" md={{ display: 'inline' }}>
                            {' '}
                            •{' '}
                        </styled.span>
                        <styled.span display="block" md={{ display: 'inline' }}>
                            Optus Stadium, Perth
                        </styled.span>
                    </styled.h2>
                ) : null}
                <styled.h1
                    fontFamily="display"
                    color="white"
                    w="full"
                    fontWeight="black"
                    textWrap="balance"
                    lineHeight={1.2}
                    fontSize={{ base: '3xl', md: '5xl', lg: '6xl' }}
                    maxWidth={{ base: 'full', md: '3/4', lg: '3/4' }}
                >
                    A one day, fully inclusive, approachable and affordable tech conference for everyone.
                </styled.h1>
            </HeaderContainer>
            <Box
                width="full"
                position="relative"
                height={350}
                sm={{ height: 400 }}
                md={{ height: 600 }}
                lg={{ height: 700 }}
                xl={{ height: 900 }}
            >
                <Box
                    position="absolute"
                    zIndex={3}
                    bottom={0}
                    bgGradient="to-b"
                    gradientFrom="transparent"
                    gradientTo="#0E0E43"
                    width="full"
                    height={200}
                    sm={{ height: 300 }}
                    md={{ height: 400 }}
                    lg={{ height: 500 }}
                    xl={{ height: 700 }}
                ></Box>
                <motion.div style={{ position: 'absolute', top: '0', left: '4%', zIndex: 2, width: '38%' }}>
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
                    }}
                >
                    <DPurple style={{ width: '100%', height: 'auto' }} />
                </motion.div>
            </Box>
        </Flex>
    )
}
