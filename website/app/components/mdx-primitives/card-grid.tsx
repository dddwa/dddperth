import type { PropsWithChildren } from 'react'
import { Flex, Grid, styled } from '~/styled-system/jsx'

type GridColumns = 1 | 2 | 3

const COLUMN_TEMPLATES: Record<GridColumns, { base: string; md?: string; lg?: string }> = {
    1: { base: '1fr' },
    2: { base: '1fr', md: 'repeat(2, 1fr)' },
    3: { base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
}

export interface CardGridProps {
    columns?: GridColumns
}

export function CardGrid({ columns = 2, children }: PropsWithChildren<CardGridProps>) {
    return (
        <Grid gridTemplateColumns={COLUMN_TEMPLATES[columns]} gap="4">
            {children}
        </Grid>
    )
}

export interface CardProps {
    title?: string
    featured?: boolean
}

export function Card({ title, featured, children }: PropsWithChildren<CardProps>) {
    return (
        <Flex
            flexDirection="column"
            gap="3"
            bgColor={featured ? 'surface.elevated' : 'surface.card'}
            borderWidth="1px"
            borderColor={featured ? 'border.emphasis' : 'border.default'}
            rounded="md"
            padding="5"
        >
            {title ? (
                <styled.h3 fontSize="lg" color="text.primary" fontWeight="semibold">
                    {title}
                </styled.h3>
            ) : null}
            <Flex flexDirection="column" gap="2" fontSize="sm" color="text.primary" lineHeight="relaxed">
                {children}
            </Flex>
        </Flex>
    )
}

export function Bullet({ children }: PropsWithChildren) {
    return (
        <Flex gap="2" alignItems="flex-start">
            <styled.span color="interactive.active" fontWeight="semibold" flexShrink="0" lineHeight="relaxed">
                →
            </styled.span>
            <styled.span fontSize="sm" color="text.primary" lineHeight="relaxed">
                {children}
            </styled.span>
        </Flex>
    )
}
