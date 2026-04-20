import { cva } from '~/styled-system/css'

export const ctaButton = cva({
    base: {
        display: 'flex',
        flexDir: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        fontWeight: 'semibold',
        fontFamily: 'display',
        transition: 'colors',
    },
    variants: {
        visual: {
            primary: {
                bg: 'brand.primary',
                color: 'text.on-brand',
                _hover: {
                    bg: 'brand.accent',
                },
                _active: {
                    bg: 'brand.accent',
                },
                _focus: {
                    ring: 'border.default',
                },
            },
            secondary: {
                bg: 'brand.secondary',
                color: 'text.on-brand',
                _hover: {
                    filter: 'brightness(0.85)',
                },
                _active: {
                    filter: 'brightness(0.85)',
                },
                _focus: {
                    ring: 'border.default',
                },
            },
            tertiary: {
                bg: 'text.on-brand',
                color: 'brand.secondary',
                _hover: {
                    bg: 'brand.secondary',
                    color: 'text.on-brand',
                },
                _active: {
                    bg: 'brand.secondary',
                    color: 'text.on-brand',
                },
                _focus: {
                    ring: 'border.default',
                },
            },
            hyperlink: {
                bg: 'transparent',
                color: 'text.secondary',
                fontFamily: 'body',
                fontWeight: 'medium',
                textAlign: 'left',
                display: 'block',
                _hover: {
                    color: 'text.on-brand',
                },
                _active: {
                    color: 'text.on-brand',
                },
                _focus: {
                    ring: 'border.default',
                },
            },
        },
        size: {
            sm: { px: '6', py: '3', fontSize: '1rem' },
            lg: { px: '8', py: '4', fontSize: '1.125rem' },
        },
        width: {
            auto: { w: 'auto' },
            full: { w: '100%', xs: { w: 'auto' } },
        },
    },
})
