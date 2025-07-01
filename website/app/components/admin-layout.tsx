import type { ReactNode } from 'react'
import { Box, styled } from '~/styled-system/jsx'

export function AdminLayout({ heading, children }: { heading: string; children: ReactNode }) {
    return (
        <Box
            bg="white"
            p={{ base: 6, md: 12 }}
            maxW="7xl"
            mx="auto"
            borderRadius="2xl"
            boxShadow="lg"
            border="1px solid"
            borderColor="gray.3"
        >
            <styled.h1 fontSize="2xl" fontWeight="bold" mb="8" letterSpacing="tight">
                {heading}
            </styled.h1>
            {children}
        </Box>
    )
}
