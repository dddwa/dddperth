import { defineConfig, defineRecipe } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import indigo from '@park-ui/panda-preset/colors/indigo'
import slate from '@park-ui/panda-preset/colors/slate'
import typographyPreset from 'pandacss-preset-typography'
import { currentTheme } from './app/theme.config'
import { createSemanticTokens, createThemeTokens } from './themes/theme-builder'

const navLinkRecipe = defineRecipe({
    className: 'navLink',
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
            primary: {
                color: 'text.on-brand',
                _hover: { color: 'text.highlight' },
                _active: { color: 'text.highlight' },
            },
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
            ghost: {
                color: 'gray.7',
                _hover: { color: 'gray.9' },
                _active: { color: 'gray.9' },
            },
            accent: {
                color: 'indigo.7',
                _hover: { color: 'indigo.8' },
                _active: { color: 'indigo.8' },
            },
        },
        size: {
            sm: { fontSize: 'sm', gap: '2' },
            md: { fontSize: 'md', gap: '2' },
            lg: { fontSize: 'lg', gap: '3' },
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
            css: { color: 'text.on-brand' },
        },
    ],
    defaultVariants: {
        variant: 'primary',
        size: 'md',
        active: false,
    },
})

const themeTokens = createThemeTokens(currentTheme)

export default defineConfig({
    // Whether to use css reset
    preflight: true,

    // Where to look for your css declarations
    include: ['./app/routes/**/*.{ts,tsx,js,jsx}', './app/components/**/*.{ts,tsx,js,jsx}'],
    presets: [
        typographyPreset(),
        '@pandacss/preset-base',
        createPreset({
            accentColor: indigo,
            grayColor: slate,
            radius: 'sm',
        }),
    ],

    jsxFramework: 'react',

    // Files to exclude
    exclude: [],

    // Enable strict tokens mode - forces usage of design tokens instead of arbitrary values
    strictTokens: true,

    // Useful for theme customization
    theme: {
        recipes: {
            navLink: navLinkRecipe,
        },
        breakpoints: {
            xxs: '340px',
            xs: '400px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '1.5xl': '1440px',
            '2xl': '1536px',
            '3xl': '1792px',
            '4xl': '1920px',
            '5xl': '2100px',
            '6xl': '2560px',
        },
        extend: {
            semanticTokens: {
                colors: {
                    // Conference theme tokens - generated from active theme
                    ...createSemanticTokens(currentTheme).colors,

                    // Typography semantic tokens (prose) - mapped to theme text tokens for dark backgrounds
                    prose: {
                        body: { value: '{colors.text.primary}' },
                        heading: { value: '{colors.text.primary}' },
                        lead: { value: '{colors.text.secondary}' },
                        link: { value: '{colors.text.highlight}' },
                        bold: { value: '{colors.text.primary}' },
                        counter: { value: '{colors.text.muted}' },
                        bullet: { value: '{colors.text.secondary}' },
                        hrBorder: { value: '{colors.border.subtle}' },
                        quote: { value: '{colors.text.primary}' },
                        quoteBorder: { value: '{colors.border.emphasis}' },
                        caption: { value: '{colors.text.muted}' },
                        kbd: { value: '{colors.text.primary}' },
                        kbdShadow: { value: '0 0 0' },
                        code: { value: '{colors.text.primary}' },
                        preCode: { value: '{colors.text.secondary}' },
                        preBg: { value: '{colors.surface.card}' },
                        thBorder: { value: '{colors.border.emphasis}' },
                        tdBorder: { value: '{colors.border.subtle}' },
                    },
                },
            },
            tokens: {
                // Conference theme tokens - generated from active theme
                ...themeTokens,

                // Legacy 2023 tokens - DEPRECATED, will be removed after migration
                // TODO: Remove these once all components use semantic tokens
                colors: {
                    ...themeTokens.colors,
                    '2023-green': { value: '#008554' },
                    '2023-orange': { value: '#F89A1C' },
                    '2023-pink': { value: '#DA459C' },
                    '2023-gray': { value: '#58595B' },
                    '2023-red': { value: '#880007' },
                    '2023-accessible-orange': { value: '#D97F07' },
                    '2023-black': { value: '#1d1d1d' },
                    '2023-white-i': { value: '#FCFCFC' },
                    '2023-white-ii': { value: '#F5F5F5' },
                    '2023-gray-light': { value: '#C8C8C8' },
                    '2023-gray-light-ii': { value: '#EAEAEA' },
                },
                borders: {
                    ...themeTokens.borders,
                    sponsor: { value: '6px solid {colors.border.sponsor}' },
                },
                fonts: {
                    display: { value: 'Ubuntu, sans-serif' },
                    body: { value: 'Ubuntu, sans-serif' },
                },
                zIndex: {
                    '9999': { value: 9999 },
                },
            },
            keyframes: {
                rotateText: {
                    '0%': {
                        transform: 'rotate(0deg)',
                    },
                    '100%': {
                        transform: 'rotate(-360deg)',
                    },
                },
            },
        },
    },

    // The output directory for your css system
    outdir: 'app/styled-system',
})
