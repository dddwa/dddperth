import type { PropsWithChildren } from 'react'
import { Flex, Grid, styled } from '~/styled-system/jsx'

export function Stats({ children }: PropsWithChildren) {
    return (
        <Grid
            gridTemplateColumns={{ base: '1fr 1fr', md: 'repeat(4, 1fr)' }}
            gap={{ base: '4', md: '6' }}
            paddingY={{ base: '8', md: '10' }}
            borderTopWidth="1px"
            borderBottomWidth="1px"
            borderColor="border.default"
        >
            {children}
        </Grid>
    )
}

export interface StatProps {
    value: string
    label: string
}

export function Stat({ value, label }: StatProps) {
    return (
        <Flex flexDirection="column" alignItems="flex-start" gap="1">
            <styled.span fontSize={{ base: '3xl', md: '4xl' }} color="text.primary" fontWeight="bold">
                {value}
            </styled.span>
            <styled.span fontSize="sm" color="text.secondary">
                {label}
            </styled.span>
        </Flex>
    )
}
