import { Box, styled } from '../../../styled-system/jsx'
import { HomepageHeroPanel } from './hero-panel'
import { HeroTitlePanel } from './hero-title-panel'

export function Hero() {
    return (
        <styled.section overflowX="hidden">
            <Box w="100%">
                <HomepageHeroPanel />
                <HeroTitlePanel />
            </Box>
        </styled.section>
    )
}
