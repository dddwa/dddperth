import { styled } from '../../../styled-system/jsx'
import { HomepageHeroPanel } from './hero-panel'
import { HeroTitlePanel } from './hero-title-panel'

export function Hero() {
  return (
    <styled.section overflowX="hidden">
      <HomepageHeroPanel />
      <HeroTitlePanel />
    </styled.section>
  )
}
