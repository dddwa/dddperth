import { motion, useScroll, useTransform } from 'framer-motion'
import DGreen from '~/images/hero/d-green.svg?react'
import DPink from '~/images/hero/d-pink.svg?react'
import DPurple from '~/images/hero/d-purple.svg?react'
import { Box, Flex } from '../../../styled-system/jsx'

export function HomepageHeroPanel() {
  const { scrollY } = useScroll()

  const y1 = useTransform(scrollY, [0, 500], [0, 0])
  const y2 = useTransform(scrollY, [0, 500], [0, 100])
  const y3 = useTransform(scrollY, [0, 500], [0, 200])

  return (
    <Flex height="100vh" width="full" alignItems="center" justifyContent="center">
      <Box width="full" position="relative">
        <motion.div style={{ position: 'absolute', top: '0', left: '4%', zIndex: 2, y: y1, width: '38%' }}>
          <DGreen style={{ width: '100%', height: 'auto' }} />
          {/* <Box
            position="absolute"
            top="21%"
            left="39%"
            width="60.7%"
            height="600px"
            backdropBlur="10px"
            zIndex={-1}
          ></Box> */}
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
