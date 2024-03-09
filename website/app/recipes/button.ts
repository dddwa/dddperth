import { cva } from '../../styled-system/css'

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
                bg: '2023-green',
                color: 'white',
                _hover: {
                    bg: '2023-accessible-orange',
                },
                _active: {
                    bg: '2023-accessible-orange',
                },
                _focus: {
                    ring: '2023-black',
                },
            },
            secondary: {
                bg: '2023-pink',
                color: 'white',
                _hover: {
                    bg: '2023-red',
                },
                _active: {
                    bg: '2023-red',
                },
                _focus: {
                    ring: '2023-black',
                },
            },
            tertiary: {
                bg: 'white',
                color: '2023-pink',
                _hover: {
                    bg: '2023-pink',
                    color: 'white',
                },
                _active: {
                    bg: '2023-pink',
                    color: 'white',
                },
                _focus: {
                    ring: '2023-black',
                },
            },
            hyperlink: {
                bg: 'transparent',
                color: '2023-gray-light',
                fontFamily: 'body',
                fontWeight: 'medium',
                textAlign: 'left',
                display: 'block',
                _hover: {
                    color: 'white',
                },
                _active: {
                    color: 'white',
                },
                _focus: {
                    ring: '2023-black',
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
