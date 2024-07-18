import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex } from '../../../styled-system/jsx'

export function HomepageHeroPanel() {
  return (
    <Box width="100%">
      <Flex width="full">
        <DGreen />
        <DPink />
        <DPurple />
      </Flex>
    </Box>
  )
}
