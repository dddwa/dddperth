import { Box } from '../../../styled-system/jsx'
import { HomepageHeroPanel } from './hero-panel'
import { HeroTitlePanel } from './hero-title-panel'

export function Hero() {
  return (
    <Box overflowX="hidden">
      <HomepageHeroPanel />
      <HeroTitlePanel />
    </Box>
  )
}
