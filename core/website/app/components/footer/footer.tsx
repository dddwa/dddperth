import { conferenceManifest } from '@conference/manifest'
import Logo from '~/images/svg/logo.svg?react'
import { css } from '~/styled-system/css'
import { Box, Divider, Flex, Grid, styled } from '~/styled-system/jsx'
import { socialsData } from './socials-data'
import { AppLink } from '../app-link'

const contactEmail = conferenceManifest.brand.contactEmail

export const Footer = () => (
    // Footer blends into the body in both themes (header behaves the same).
    // Nav links use the `chrome` variant so the text adapts via `text.primary`,
    // and the Logo's `currentColor` inherits the same value, putting the PERTH
    // wordmark in the body text colour.
    //
    // Sponsor logos are intentionally not shown here: the home-page hero
    // strip is the single curated sponsor surface, and duplicating it in
    // the footer competed visually on long pages. The /sponsors and
    // /sponsorship nav links below give discovery without the noise.
    <Box mt="48" pt="12" pb="12" px="5" bg="surface.footer" color="text.primary">
        <Divider color="border.subtle" mb="6" />
        <Grid
            gridTemplateColumns="1fr"
            md={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
            width="full"
            gap="6"
            maxW="breakpoint-2xl"
            mx="auto"
        >
            <Flex flexGrow={2}>
                <Logo width={153} />
            </Flex>
            <Flex direction="column" gap="1" fontWeight="medium">
                <AppLink to="/agenda#previous-years" variant="chrome">
                    Previous Years Sessions
                </AppLink>
                {/* <styled.a href={`/speakers`} color="text.primary" _hover={{ color: '#8282FB' }}>
                    Speakers
                </styled.a> */}
                <AppLink to="/agenda" variant="chrome">
                    Agenda
                </AppLink>
                <AppLink to="/sponsors" variant="chrome">
                    Sponsors
                </AppLink>
                <AppLink to="/sponsorship" variant="chrome">
                    Become a sponsor
                </AppLink>
                <AppLink to="/about" variant="chrome">
                    About
                </AppLink>
                {/* <styled.a href={`/blog`} color="text.primary" _hover={{ color: '#8282FB' }}>
                Blog
                </styled.a> */}
                <AppLink to="/faq" variant="chrome">
                    FAQ
                </AppLink>
                <AppLink to="/admin" variant="chrome">
                    Admin
                </AppLink>
            </Flex>
            <Flex direction="column" gap="1" fontWeight="medium">
                <AppLink to="/code-of-conduct" variant="chrome">
                    Code Of Conduct
                </AppLink>
                <AppLink to="/venue" variant="chrome">
                    Venue
                </AppLink>
                <AppLink to="/health-policy" variant="chrome">
                    Health Policy
                </AppLink>
                <AppLink to="/volunteer" variant="chrome">
                    Work With Us
                </AppLink>
                <styled.a href={`mailto:${contactEmail}`} color="text.highlight" _hover={{ color: 'interactive.active' }}>
                    {contactEmail}
                </styled.a>
            </Flex>
            <Flex direction="column" gap="4">
                {/* <styled.p color="#C2C2FF" fontSize="2xl" lineHeight={1.2} textWrap="balance">
                    Subscribe for the latest DDD updates
                </styled.p>
                <styled.input
                    type="email"
                    placeholder="Email Address"
                    bg="#0E0E43"
                    color="text.primary"
                    borderRightRadius="full"
                    px={4}
                    py={2}
                    fontSize="lg"
                    border="1px solid #8D8DFF33"
                    _placeholder={{ color: '#8282FB' }}
                    mb={4}
                /> */}
                <Flex direction="row" gap="1">
                    {socialsData.map((item) => (
                        <styled.a
                            aria-label={`Visit us on ${item.title}`}
                            key={item.link}
                            href={item.link}
                            target={`_blank`}
                            rel={`nofollow noopener`}
                            display="flex"
                            justifyContent="flex-start"
                            alignItems="center"
                        >
                            <item.icon
                                className={css({
                                    w: '8',
                                    color: 'text.highlight',
                                    transition: 'colors',
                                    _hover: { color: 'interactive.active' },
                                })}
                            />
                        </styled.a>
                    ))}
                </Flex>
            </Flex>
        </Grid>
    </Box>
)
