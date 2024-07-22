import { motion, useScroll, useTransform } from 'framer-motion'
import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex, styled } from '../../../styled-system/jsx'

export function HomepageHeroPanel() {
  const { scrollY } = useScroll()

  const y1 = useTransform(scrollY, [0, 400], [0, 0])
  const y2 = useTransform(scrollY, [0, 400], [0, 100])
  const y3 = useTransform(scrollY, [0, 400], [0, 200])

  return (
    <Flex
      height="120vh"
      overflow="hidden"
      direction="column"
      alignItems="center"
      width="full"
      gradientFrom="#070727"
      gradientTo="#0E0E43"
      gap={48}
      pt={24}
      bgGradient="to-b"
    >
      <Box maxW="1200px">
        <styled.h2 color="#8282FB" fontSize="xl" fontWeight="bold" textWrap="balance" maxWidth="3/4">
          Sat 7th October, 2023 • Optus Stadium, Perth
        </styled.h2>
        <styled.h1
          fontFamily="sans-serif"
          color="white"
          fontSize="xl"
          w="full"
          fontWeight="bold"
          textWrap="balance"
          lineHeight={1.2}
          maxWidth="3/4"
          sm={{ fontSize: '3xl' }}
          lg={{ fontSize: '4xl' }}
          xl={{ fontSize: '6xl' }}
        >
          A one day, fully inclusive, approachable and affordable tech conference for everyone.
        </styled.h1>
      </Box>
      <Box width="full" position="relative" bottom={0}>
        <motion.div style={{ position: 'absolute', top: '0', left: '4%', zIndex: 2, y: y1, width: '38%' }}>
          <DGreen style={{ width: '100%', height: 'auto' }} />
        </motion.div>
        <motion.div
          style={{
            position: 'absolute',
            top: '0',
            marginTop: '20px',
            left: '30%',
            zIndex: 1,
            y: y2,
            width: '38%',
          }}
        >
          <DPink style={{ width: '100%', height: 'auto' }} />
        </motion.div>
        <motion.div
          style={{
            position: 'absolute',
            top: '0',
            marginTop: '40px',
            left: '56%',
            transform: 'translateX(-50%)',
            y: y3,
            width: '38%',
          }}
        >
          <DPurple style={{ width: '100%', height: 'auto' }} />
        </motion.div>
      </Box>
    </Flex>
  )
}
