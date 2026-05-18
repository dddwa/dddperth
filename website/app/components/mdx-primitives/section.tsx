import type { PropsWithChildren } from 'react'
import { Box, styled } from '~/styled-system/jsx'

export interface SectionProps {
    title?: string
    lede?: string
}

export function Section({ title, lede, children }: PropsWithChildren<SectionProps>) {
    return (
        <Box as="section" paddingY={{ base: '12', md: '16' }}>
            {title ? (
                <styled.h2 fontSize={{ base: '3xl', md: '4xl' }} color="text.primary" marginBottom="2">
                    {title}
                </styled.h2>
            ) : null}
            {lede ? (
                <styled.p color="text.secondary" maxWidth="[720px]" marginBottom="8">
                    {lede}
                </styled.p>
            ) : null}
            {children}
        </Box>
    )
}
