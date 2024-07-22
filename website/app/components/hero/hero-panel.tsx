import { motion, useScroll, useTransform } from 'framer-motion'
import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex } from '../../../styled-system/jsx'

export function HomepageHeroPanel() {
  const { scrollY } = useScroll()

  const y1 = useTransform(scrollY, [0, 200], [0, 0])
  const y2 = useTransform(scrollY, [0, 200], [0, 100])
  const y3 = useTransform(scrollY, [0, 200], [0, 200])

  return (
    <Flex
      height="100vh"
      width="full"
      alignItems="center"
      justifyContent="center"
      gradientTo="#0E0E43"
      gradientFrom="#070727"
      bgGradient="to-b"
    >
      <Box width="full" position="relative">
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
