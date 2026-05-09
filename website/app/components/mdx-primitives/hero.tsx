import type { PropsWithChildren, ReactNode } from 'react'
import { Flex, styled } from '~/styled-system/jsx'

export interface HeroProps {
    eyebrow?: string
    title: string
    lede?: string
    actions?: ReactNode
}

export function Hero({ eyebrow, title, lede, actions, children }: PropsWithChildren<HeroProps>) {
    return (
        <Flex
            as="header"
            flexDirection="column"
            alignItems="flex-start"
            gap="6"
            paddingY={{ base: '12', md: '16' }}
        >
            {eyebrow ? (
                <styled.span
                    fontSize="sm"
                    color="text.secondary"
                    textTransform="uppercase"
                    letterSpacing="wider"
                >
                    {eyebrow}
                </styled.span>
            ) : null}
            <styled.h1
                fontSize={{ base: '4xl', md: '6xl' }}
                color="white"
                lineHeight="tight"
                fontWeight="bold"
            >
                {title}
            </styled.h1>
            {lede ? (
                <styled.p fontSize={{ base: 'lg', md: 'xl' }} color="text.secondary" maxWidth="[720px]">
                    {lede}
                </styled.p>
            ) : null}
            {actions ? (
                <Flex gap="4" flexWrap="wrap" alignItems="center">
                    {actions}
                </Flex>
            ) : null}
            {children}
        </Flex>
    )
}
