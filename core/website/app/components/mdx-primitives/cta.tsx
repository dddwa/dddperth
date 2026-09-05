import type { PropsWithChildren } from 'react'
import { AppLink } from '../app-link'

export interface CTAProps {
    href: string
    variant?: 'primary' | 'secondary'
}

export function CTA({ href, variant = 'primary', children }: PropsWithChildren<CTAProps>) {
    if (variant === 'secondary') {
        return (
            <AppLink unstyled
                to={href}
                color="text.secondary"
                fontSize="sm"
                _hover={{ color: 'white', textDecoration: 'underline' }}
            >
                {children}
            </AppLink>
        )
    }

    return (
        <AppLink unstyled
            to={href}
            display="inline-flex"
            alignItems="center"
            bgColor="brand.primary"
            color="text.on-brand"
            fontWeight="semibold"
            paddingX="6"
            paddingY="3"
            rounded="md"
            _hover={{ bgColor: 'brand.secondary' }}
        >
            {children}
        </AppLink>
    )
}
