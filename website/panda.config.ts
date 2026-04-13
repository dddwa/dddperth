import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import indigo from '@park-ui/panda-preset/colors/indigo'
import slate from '@park-ui/panda-preset/colors/slate'
import typographyPreset from 'pandacss-preset-typography'
import { currentTheme } from './app/theme.config'
import { createSemanticTokens, createThemeTokens } from './themes/theme-builder'

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

                    surface: {
                        'card-alt': {
                            value: { base: '#f8f8ff', _dark: '#151544' },
                        },
                    },
                    sponsor: {
                        platinum: {
                            value: { base: '#e8e8e8', _dark: '#c0c0c0' },
                        },
                        gold: {
                            value: { base: '#FFD700', _dark: '#D4AF37' },
                        },
                        silver: {
                            value: { base: '#C0C0C0', _dark: '#A8A8A8' },
                        },
                        bronze: {
                            value: { base: '#CD7F32', _dark: '#B87333' },
                        },
                        room: {
                            value: { base: '#6366f1', _dark: '#4f46e5' },
                        },
                        digital: {
                            value: { base: '#06b6d4', _dark: '#0891b2' },
                        },
                        community: {
                            value: { base: '#10b981', _dark: '#059669' },
                        },
                    },
                    // Typography semantic tokens (prose)
                    prose: {
                        body: {
                            value: '{colors.gray.dark.7}',
                        },
                        heading: {
                            value: '{colors.gray.dark.9}',
                        },
                        lead: {
                            value: '{colors.gray.dark.6}',
                        },
                        link: {
                            value: '{colors.gray.dark.2}',
                        },
                        bold: {
                            value: '{colors.gray.dark.9}',
                        },
                        counter: {
                            value: '{colors.gray.dark.5}',
                        },
                        bullet: {
                            value: '{colors.gray.dark.3}',
                        },
                        hrBorder: {
                            value: '{colors.gray.dark.2}',
                        },
                        quote: {
                            value: '{colors.gray.dark.9}',
                        },
                        quoteBorder: {
                            value: '{colors.gray.dark.2}',
                        },
                        caption: {
                            value: '{colors.gray.dark.5}',
                        },
                        kbd: {
                            value: '{colors.gray.dark.9}',
                        },
                        kbdShadow: {
                            // Expects an RGB value
                            value: '0 0 0',
                        },
                        code: {
                            value: '{colors.gray.dark.9}',
                        },
                        preCode: {
                            value: '{colors.gray.dark.2}',
                        },
                        preBg: {
                            value: '{colors.gray.dark.8}',
                        },
                        thBorder: {
                            value: '{colors.gray.dark.3}',
                        },
                        tdBorder: {
                            value: '{colors.gray.dark.2}',
                        },
                    },
                },
            },
            tokens: {
                // Conference theme tokens - generated from active theme
                ...createThemeTokens(currentTheme),

                // Legacy 2023 tokens - DEPRECATED, will be removed after migration
                // TODO: Remove these once all components use semantic tokens
                colors: {
                    ...createThemeTokens(currentTheme).colors,
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
