import { conferenceConfig } from '~/config/conference-config'
import Logo from '~/images/svg/logo.svg?react'
import { Box, Flex, styled } from '../../../styled-system/jsx'
import { AppLink } from '../app-link'

export function Header() {
  return (
    <>
      <styled.header position="relative" bgColor="#070727" w="100%" display="flex" zIndex="10" py={4}>
        <Box w="100%" position="relative" maxW="1200px" m="0 auto">
          <Box w="100%" position="relative">
            <Flex flexDir="row" justifyContent="space-between" alignItems="center">
              <Flex flexDir="row" justifyContent="flex-start" alignItems="flex-start" md={{ p: '4' }}>
                <AppLink
                  aria-label={`Visit the ${conferenceConfig.name} homepage`}
                  to={`/`}
                  display="flex"
                  justifyContent="flex-start"
                  alignItems="center"
                  h="20"
                  px="4"
                  md={{ px: '0', h: 'auto' }}
                >
                  <Logo width={153} />
                </AppLink>
              </Flex>
              <Flex flexDir="row" alignItems="center" gap={12} fontWeight={600}>
                <styled.a href="/event/speakers" color="white" _hover={{ color: '#8282FB' }}>
                  Speakers
                </styled.a>
                <styled.a href="/agenda" color="white" _hover={{ color: '#8282FB' }}>
                  Agenda
                </styled.a>
                <styled.a href="/about" color="white" _hover={{ color: '#8282FB' }}>
                  About
                </styled.a>
                <styled.a href="/blog" color="white" _hover={{ color: '#8282FB' }}>
                  Blog
                </styled.a>
                <styled.a
                  href="/tickets"
                  color="#520030"
                  _hover={{ gradientTo: '#FF52B7' }}
                  bgGradient="to-r"
                  gradientFrom="#FF52B7"
                  gradientTo="#FF8273"
                  borderRightRadius={100}
                  fontWeight={600}
                  py={2}
                  px={4}
                >
                  Buy Tickets ↗
                </styled.a>
              </Flex>
            </Flex>
          </Box>
        </Box>
      </styled.header>
    </>
  )
}
