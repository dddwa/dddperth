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
            outline: '2px solid',
            outlineColor: 'accent.7',
            outlineOffset: '2px',
        },
    },
    variants: {
        variant: {
            // Main site navigation (header/footer)
            primary: {
                color: 'white',
                _hover: {
                    color: '#8282FB',
                },
                _active: {
                    color: '#8282FB',
                },
            },
            // Admin navigation with active states
            admin: {
                px: '4',
                py: '2',
                borderRadius: 'md',
                border: '1px solid transparent',
                _hover: {
                    bg: 'rgba(255, 245, 157, 0.05)',
                    borderColor: 'rgba(255, 245, 157, 0.2)',
                },
            },
            // Simple text links
            ghost: {
                color: 'slate.7',
                _hover: {
                    color: 'slate.9',
                },
                _active: {
                    color: 'slate.9',
                },
            },
            // Accent colored links
            accent: {
                color: 'accent.7',
                _hover: {
                    color: 'accent.8',
                },
                _active: {
                    color: 'accent.8',
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
                color: 'rgb(255, 245, 157)',
                bg: 'rgba(255, 245, 157, 0.1)',
                borderColor: 'rgba(255, 245, 157, 0.3)',
            },
        },
        {
            variant: 'admin',
            active: false,
            css: {
                color: 'white',
            },
        },
    ],
    defaultVariants: {
        variant: 'primary',
        size: 'md',
        active: false,
    },
})