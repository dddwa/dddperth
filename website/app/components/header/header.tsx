import { useState } from 'react'
import { conferenceConfig } from '~/config/conference-config'
import Logo from '~/images/svg/logo.svg?react'
import TicketIcon from '~/images/svg/ticket-icon.svg?react'
import { css } from '../../../styled-system/css'
import { Box, Flex, styled } from '../../../styled-system/jsx'
import { AppLink } from '../app-link'
import { DesktopLinks } from './desktop-links'
import { MenuButton } from './menu-button'
import { MenuFlyout } from './menu-flyout'

export function Header() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <styled.header position="relative" w="100%" display="flex" zIndex="10">
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
              <Flex flexDir="row" justifyContent="flex-start" alignItems="flex-start">
                {/* Desktop Links */}
                <Box
                  display="none"
                  flexDir="row"
                  justifyContent="flex-start"
                  alignItems="flex-start"
                  md={{ display: 'flex' }}
                >
                  <DesktopLinks />
                </Box>
                {/* Primary Buttons */}
                <Flex display="flex" flexDir="row" justifyContent="flex-start" alignItems="center" md={{ p: '4' }}>
                  {/* Buy tickets button */}
                  <AppLink
                    aria-label={`Buy tickets`}
                    to={`/`}
                    w="20"
                    h="20"
                    bg="2023-orange"
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    md={{
                      w: 'auto',
                      h: 'auto',
                      bg: '2023-green',
                      px: '8',
                      py: '5',
                      transition: 'colors',
                      _hover: { bg: '2023-orange' },
                      _active: { bg: '2023-red' },
                      _focus: { ring: '2023-black' },
                    }}
                  >
                    <TicketIcon
                      className={css({
                        w: '7',
                        // xs: { w: '8' },
                        md: { display: 'none' },
                      })}
                    />
                    <styled.span
                      display="none"
                      color="white"
                      md={{
                        display: 'block',
                        fontFamily: 'display',
                        fontWeight: 'semibold',
                      }}
                    >
                      Buy Tickets
                    </styled.span>
                  </AppLink>
                  {/* Open menu button */}
                  <MenuButton isOpen={isOpen} onClick={() => setIsOpen(!isOpen)} />
                </Flex>
              </Flex>
            </Flex>
          </Box>
        </Box>
      </styled.header>
      {isOpen && <MenuFlyout close={() => setIsOpen(false)} />}
    </>
  )
}
