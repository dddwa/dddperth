import type { ReactNode } from 'react'
import { Box, styled } from '~/styled-system/jsx'

export function AdminLayout({
    heading,
    children,
    fullWidth,
}: {
    heading: string
    children: ReactNode
    fullWidth?: boolean
}) {
    return (
        <Box
            bg="white"
            p={{ base: '6', md: '12' }}
            maxW={fullWidth ? 'full' : '7xl'}
            mx="auto"
            borderRadius="2xl"
            boxShadow="lg"
            border="admin-subtle"
        >
            <styled.h1 fontSize="2xl" fontWeight="bold" mb="8" letterSpacing="tight">
                {heading}
            </styled.h1>
            {children}
        </Box>
    )
}
