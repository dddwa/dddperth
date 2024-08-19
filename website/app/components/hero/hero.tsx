import { Box, Flex } from '../../../styled-system/jsx'
import ImportantDates from '../page-components/important-dates'
import { HomepageHeroPanel } from './hero-panel'

export function Hero() {
  return (
    <Box overflowX="hidden">
      <HomepageHeroPanel />
      <Flex
        className={`paragraph-wrapper`}
        w="100%"
        maxWidth="3/5"
        direction="column"
        fontSize="2xl"
        fontWeight="medium"
        mx="auto"
        color="white"
        gap={6}
      >
        <p>
          DDD Perth is Perth’s largest community run conference for the tech community. Our goal is to create an
          approachable event that appeals to the whole community, especially people that don’t normally get to attend or
          speak at conferences. The conference is run on a Saturday, and strives to be inclusive of everyone in the
          Perth tech community.
        </p>
        <p>
          DDD Perth started out its life as part of the Developer! Developer! Developer! series of events and while our
          heritage is as a developer-focussed conference, DDD Perth is not just for developers, but for all
          professionals in the software industry. These days we don’t expand DDD - it’s not an acronym for us anymore,
          but if people insist then we might say Designer, Developer and Data Scientist, or is it DevOps, Data
          architect, distributed tester?
        </p>
        <p>Check out the agenda and talks from previous years , or hear more about how we do what we do on our blog.</p>
      </Flex>
      <ImportantDates />
    </Box>
  )
}
