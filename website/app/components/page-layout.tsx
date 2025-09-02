import type { PropsWithChildren } from 'react'
import { Box, Flex } from '~/styled-system/jsx'

export interface PageLayoutProps {
    /** Background gradient for the page */
    withGradient?: boolean
    /** Additional padding inside the container */
    innerPadding?: boolean
    /** Custom background color */
    bgColor?: string
    /** Minimum height for the page */
    minHeight?: string
}

/**
 * Standardized page layout component that provides:
 * - Consistent max width (1200px)
 * - Responsive padding system
 * - Optional gradient background
 * - Consistent container behavior across all pages
 */
export function PageLayout({
    children,
    withGradient = true,
    innerPadding = true,
    bgColor,
    minHeight,
}: PropsWithChildren<PageLayoutProps>) {
    const containerProps = {
        w: '100%',
        maxW: '1200px',
        mx: 'auto',
        px: { base: 4, md: 4 }, // Consistent responsive padding
        ...(innerPadding && { py: { base: 4, md: 6 } }),
    }

    const wrapperProps = {
        w: '100%',
        color: 'white',
        ...(minHeight && { minHeight }),
        ...(withGradient && {
            bgGradient: 'to-b',
            gradientFrom: '#070727',
            gradientToPosition: '99%',
            gradientTo: '#0E0E43',
        }),
        ...(bgColor && { bgColor }),
    }

    return (
        <Flex flexDirection="column" {...wrapperProps}>
            <Box {...containerProps}>{children}</Box>
        </Flex>
    )
}

/**
 * Specialized layout for content pages with sidebar
 */
export function ContentPageLayout({ children, ...props }: PropsWithChildren<PageLayoutProps>) {
    return (
        <PageLayout {...props} innerPadding={false}>
            <Box py={{ base: 4, md: 6 }}>{children}</Box>
        </PageLayout>
    )
}

/**
 * Header container component that matches PageLayout container
 */
export function HeaderContainer({ children }: PropsWithChildren) {
    return (
        <Box w="100%" maxW="1200px" mx="auto" px={{ base: 4, md: 4 }}>
            {children}
        </Box>
    )
}