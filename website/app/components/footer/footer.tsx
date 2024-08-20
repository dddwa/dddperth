import Logo from '~/images/svg/logo.svg?react'
import { css } from '../../../styled-system/css'
import { Box, Divider, Flex, Grid, styled } from '../../../styled-system/jsx'
import { socialsData } from '../../config/socials-data'

export const Footer = () => (
  <Box
    mt={48}
    gap={6}
    mx="5"
    xl={{
      mx: 0,
    }}
  >
    <Divider color="#8D8DFF33" mb={6} />
    <Grid
      gridTemplateColumns="1fr"
      md={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
      width="full"
      gap={6}
      maxW="1200px"
      mx="auto"
    >
      <Flex flexGrow={2}>
        <Logo width={153} />
      </Flex>
      <Flex direction="column" gap={1} fontWeight="medium">
        <styled.a href={`/agenda#previous-years`} color="white" _hover={{ color: '#8282FB' }}>
          Previous Years Sessions
        </styled.a>
        {/* <styled.a href={`/speakers`} color="white" _hover={{ color: '#8282FB' }}>
                    Speakers
                </styled.a> */}
        <styled.a href={`/agenda`} color="white" _hover={{ color: '#8282FB' }}>
          Agenda
        </styled.a>
        {/* <styled.a href={`/sponsorship`} color="white" _hover={{ color: '#8282FB' }}>
                    Sponsorship
                </styled.a> */}
        <styled.a href={`/about`} color="white" _hover={{ color: '#8282FB' }}>
          About
        </styled.a>
        {/* <styled.a href={`/blog`} color="white" _hover={{ color: '#8282FB' }}>
                Blog
                </styled.a> */}
        <styled.a href={`/faq`} color="white" _hover={{ color: '#8282FB' }}>
          FAQ
        </styled.a>
      </Flex>
      <Flex direction="column" gap={1} fontWeight="medium">
        <styled.a href={`/code-of-conduct`} color="white" _hover={{ color: '#8282FB' }}>
          Code Of Conduct
        </styled.a>
        <styled.a href={`/venue`} color="white" _hover={{ color: '#8282FB' }}>
          Venue
        </styled.a>
        <styled.a href={`/health-policy`} color="white" _hover={{ color: '#8282FB' }}>
          Health Policy
        </styled.a>
        <styled.a href={`/volunteer`} color="white" _hover={{ color: '#8282FB' }}>
          Work With Us
        </styled.a>
        <styled.a href={`mailto:info@dddperth.com`} color="#8282FB" _hover={{ color: 'white' }}>
          info@dddperth.com
        </styled.a>
      </Flex>
      <Flex direction="column" gap={4}>
        {/* <styled.p color="#C2C2FF" fontSize="2xl" lineHeight={1.2} textWrap="balance">
                    Subscribe for the latest DDD updates
                </styled.p>
                <styled.input
                    type="email"
                    placeholder="Email Address"
                    bg="#0E0E43"
                    color="white"
                    borderRightRadius="full"
                    px={4}
                    py={2}
                    fontSize="lg"
                    border="1px solid #8D8DFF33"
                    _placeholder={{ color: '#8282FB' }}
                    mb={4}
                /> */}
        <Flex direction="row" gap={1}>
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
                  color: '#8282FB',
                  transition: 'colors',
                  _hover: { color: 'white' },
                })}
              />
            </styled.a>
          ))}
        </Flex>
      </Flex>
    </Grid>
  </Box>
)
