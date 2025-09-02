import { $path } from 'safe-routes'
import { conferenceConfigPublic } from '~/config/conference-config-public'
import Logo from '~/images/svg/logo.svg?react'
import { Box, Flex, Grid, styled } from '~/styled-system/jsx'
import { AppLink } from '../app-link'
import { HeaderContainer } from '../page-layout'

export function Header({
    cfpOpen,
    votingOpen,
    ticketSalesOpen,
}: {
    cfpOpen: boolean
    votingOpen: boolean
    ticketSalesOpen: boolean
}) {
    return (
        <styled.header position="relative" bgColor="#070727" w="100%" display="flex" zIndex="10" py={4}>
            <HeaderContainer>
                <Grid
                    gridTemplateAreas={{
                        base: '"logo cta" "nav nav"',
                        md: '"logo nav cta"',
                    }}
                    gridTemplateColumns={{
                        base: '1fr auto',
                        md: 'auto 1fr auto',
                    }}
                    gridTemplateRows={{
                        base: 'auto auto',
                        md: 'auto',
                    }}
                    gap={{ base: 4, md: 4 }}
                    alignItems="center"
                >
                    {/* Logo */}
                    <Box gridArea="logo">
                        <AppLink
                            aria-label={`Visit the ${conferenceConfigPublic.name} homepage`}
                            to={`/`}
                            display="flex"
                            justifyContent="flex-start"
                            alignItems="center"
                            width={{ base: 110, md: 180 }}
                        >
                            <Logo />
                        </AppLink>
                    </Box>

                    {/* Navigation */}
                    <Flex
                        gridArea="nav"
                        alignItems="center"
                        justifyContent={{ base: 'center', md: 'center' }}
                        flexWrap={{ base: 'wrap', md: 'nowrap' }}
                        gap={{ base: 4, md: 12 }}
                        fontSize={{ base: 'sm', md: 'md' }}
                        fontWeight={600}
                    >
                        <AppLink to="/sponsorship" variant="primary">
                            Sponsorship
                        </AppLink>
                        <AppLink to="/sponsors" variant="primary">
                            Sponsors
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
                    </Flex>

                    {/* CTA */}
                    <Box gridArea="cta" display="flex" justifyContent="flex-end">
                        {votingOpen ? (
                            <CtaLink to={$path('/voting')} label="Vote!" />
                        ) : cfpOpen ? (
                            <CtaLink to={'/call-for-presentations'} label="Propose a Talk" />
                        ) : ticketSalesOpen ? (
                            <CtaLink to={'/tickets'} label="Buy Tickets" />
                        ) : null}
                    </Box>
                </Grid>
            </HeaderContainer>
        </styled.header>
    )
}

function CtaLink({ to, label, isExternal }: { to: string; label: string; isExternal?: boolean }) {
    return (
        <AppLink
            to={to}
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
            mr={{ base: 2, sm: 4 }}
            xl={{
                mr: 0,
            }}
        >
            {label}
            {isExternal ? <styled.span display={{ base: 'hidden', md: 'inline-block' }}>↗</styled.span> : null}
        </AppLink>
    )
}
