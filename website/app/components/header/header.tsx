import { conferenceConfigPublic } from '~/config/conference-config-public'
import Logo from '~/images/svg/logo.svg?react'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import { AppLink } from '../app-link'

export function Header() {
    return (
        <styled.header position="relative" bgColor="#070727" w="100%" display="flex" zIndex="10" py={4}>
            <Box w="100%" position="relative" maxW="1200px" m="0 auto">
                <Box w="100%" position="relative">
                    <Flex flexDir="row" justifyContent="space-between" alignItems="center">
                        <Flex flexDir="row" justifyContent="flex-start" alignItems="flex-start" p={{ base: 4, md: 0 }}>
                            <AppLink
                                aria-label={`Visit the ${conferenceConfigPublic.name} homepage`}
                                to={`/`}
                                display="flex"
                                justifyContent="flex-start"
                                alignItems="center"
                                ml={{ base: 4, md: 0 }}
                                width={{ base: 110, md: 180 }}
                            >
                                <Logo />
                            </AppLink>
                        </Flex>
                        <Flex
                            flexDir="row"
                            alignItems="center"
                            fontSize={{ base: 'sm', md: 'md' }}
                            gap={{ base: 4, md: 12 }}
                            fontWeight={600}
                        >
                            <Grid
                                fontSize={{ base: 'sm', md: 'md' }}
                                gap={{ base: 4, md: 12 }}
                                fontWeight={600}
                                gridTemplateRows={{
                                    base: 'repeat(2, 1fr)',
                                    md: 'repeat(1, 1fr)',
                                }}
                                gridTemplateColumns={{
                                    base: 'repeat(2, 1fr)',
                                    md: 'repeat(4, 1fr)',
                                }}
                            >
                                <AppLink to="/sponsorship" variant="primary">
                                    Sponsorship
                                </AppLink>
                                <AppLink to="/agenda" variant="primary">
                                    Agenda
                                </AppLink>
                                <AppLink to="/about" variant="primary">
                                    About
                                </AppLink>
                                <AppLink to="/team" variant="primary">
                                    Team
                                </AppLink>
                            </Grid>
                            {/* <AppLink href="/blog" color="white" _hover={{ color: '#8282FB' }}>
                                Blog
                            </AppLink> */}
                            <styled.div gap={2} display="grid">
                                {/* <styled.a
                                    href="/tickets"
                                    color="#520030"
                                    _hover={{ gradientTo: '#FF52B7' }}
                                    bgGradient="to-r"
                                    gradientFrom="#FF52B7"
                                    gradientTo="#FF8273"
                                    borderRightRadius={100}
                                    display="flex"
                                    whiteSpace="nowrap"
                                    flexWrap="nowrap"
                                    fontWeight={600}
                                    gap={2}
                                    px={{ base: 2, md: 4 }}
                                    py={2}
                                    mr={4}
                                    xl={{
                                        mr: 0,
                                    }}
                                >
                                    Buy Tickets{' '}
                                    <styled.span display={{ base: 'hidden', md: 'inline-block' }}>↗</styled.span>
                                </styled.a> */}
                                <styled.a
                                    href="https://dddperth.deco-apparel.com/"
                                    color="#520030"
                                    _hover={{ gradientTo: '#FF52B7' }}
                                    bgGradient="to-r"
                                    gradientFrom="#FF52B7"
                                    gradientTo="#FF8273"
                                    borderRightRadius={100}
                                    display="flex"
                                    whiteSpace="nowrap"
                                    flexWrap="nowrap"
                                    fontWeight={600}
                                    gap={2}
                                    px={{ base: 2, md: 4 }}
                                    py={2}
                                    mr={4}
                                    xl={{
                                        mr: 0,
                                    }}
                                >
                                    Buy Merch{' '}
                                    <styled.span display={{ base: 'hidden', md: 'inline-block' }}>↗</styled.span>
                                </styled.a>
                            </styled.div>
                        </Flex>
                    </Flex>
                </Box>
            </Box>
        </styled.header>
    )
}
