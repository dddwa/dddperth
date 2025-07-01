import type { ReactNode } from 'react'
import type { BoxProps } from '~/styled-system/jsx'
import { Box } from '~/styled-system/jsx'

export function AdminCard({ children, ...props }: { children: ReactNode } & BoxProps) {
    return (
        <Box
            bg="white"
            p={{ base: 4, md: 6 }}
            borderRadius="xl"
            boxShadow="sm"
            border="1px solid"
            borderColor="gray.3"
            mb="8"
            {...props}
        >
            {children}
        </Box>
    )
}
