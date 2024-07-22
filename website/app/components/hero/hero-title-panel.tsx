import { Box, styled } from '../../../styled-system/jsx'
import { ctaButton } from '../../recipes/button'
import { AppLink } from '../app-link'

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
                DDD Perth is Perth&quot;s largest community run conference for the tech community. Our goal is to create
                an inclusive, approachable event that appeals to everyone, especially people that don&quot;t normally
                get to attend or speak at conferences.
              </p>
              <styled.p mt="4" lg={{ mt: '6' }}>
                Check out the agenda and talks from previous years, or hear more about how we do what we do on our{' '}
                <AppLink to="./">blog</AppLink>.
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
