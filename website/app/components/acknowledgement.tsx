import AboriginalLogo from '~/images/svg/aboriginal_ddd.svg?react'
import { Box, Divider, Flex, styled } from '../../styled-system/jsx'

export const Acknowledgement = () => (
  <Box
    pt={12}
    pb={{ base: 12, md: 24 }}
    bgGradient="to-b"
    mx="5"
    xl={{
      mx: 0,
    }}
  >
    <Flex direction="column" gap={6} maxW="1200px" mx="auto">
      <Divider color="#8D8DFF33" mb={6} />
      <AboriginalLogo width={58} />
      <styled.p fontSize={{ base: 'md', md: 'xl' }} color="#C2C2FF">
        It’s such a privilege to be able to run this conference and DDD Perth would love to acknowledge the traditional
        custodians of the land in which DDD is created, presented, and shared, the{' '}
        <styled.span color="white" fontWeight="semibold">
          Whadjuk people of the Noongar Nation
        </styled.span>{' '}
        and their connections to land, sea and community. We pay our respect to their Elders past, present and emerging,
        and extend that respect to all Aboriginal and Torres Strait Islander peoples today.
      </styled.p>
    </Flex>
  </Box>
)
