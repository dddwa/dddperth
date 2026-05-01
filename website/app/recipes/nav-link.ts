import { cva } from '~/styled-system/css'

export const navLink = cva({
    base: {
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'body',
        fontWeight: 'medium',
        textDecoration: 'none',
        transition: 'colors',
        _focus: {
            outline: '[2px solid token(colors.indigo.7)]',
            outlineOffset: '[2px]',
        },
    },
    variants: {
        variant: {
            // Main site navigation (header/footer)
            primary: {
                color: 'text.on-brand',
                _hover: {
                    color: 'text.highlight',
                },
                _active: {
                    color: 'text.highlight',
                },
            },
            // Admin navigation with active states
            admin: {
                px: '4',
                py: '2',
                borderRadius: 'md',
                border: '[1px solid transparent]',
                _hover: {
                    bg: 'overlay.subtle',
                    borderColor: 'border.subtle',
                },
            },
            // Simple text links
            ghost: {
                color: 'gray.7',
                _hover: {
                    color: 'gray.9',
                },
                _active: {
                    color: 'gray.9',
                },
            },
            // Accent colored links
            accent: {
                color: 'indigo.7',
                _hover: {
                    color: 'indigo.8',
                },
                _active: {
                    color: 'indigo.8',
                },
            },
        },
        size: {
            sm: {
                fontSize: 'sm',
                gap: '2',
            },
            md: {
                fontSize: 'md',
                gap: '2',
            },
            lg: {
                fontSize: 'lg',
                gap: '3',
            },
        },
        active: {
            true: {},
            false: {},
        },
    },
    compoundVariants: [
        {
            variant: 'admin',
            active: true,
            css: {
                color: 'interactive.active',
                bg: 'overlay.moderate',
                borderColor: 'border.subtle',
            },
        },
        {
            variant: 'admin',
            active: false,
            css: {
                color: 'text.on-brand',
            },
        },
    ],
    defaultVariants: {
        variant: 'primary',
        size: 'md',
        active: false,
    },
})