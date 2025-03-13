import { defineConfig } from '@pandacss/dev'
import { createPreset } from '@park-ui/panda-preset'
import indigo from '@park-ui/panda-preset/colors/indigo'
import slate from '@park-ui/panda-preset/colors/slate'
import typographyPreset from 'pandacss-preset-typography'
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
                    // Or whatever name you've set as the semantic tokens
                    // prefix or recipe name
                    prose: {
                        body: {
                            value: '{colors.slate.dark.7}',
                        },
                        heading: {
                            value: '{colors.slate.dark.9}',
                        },
                        lead: {
                            value: '{colors.slate.dark.6}',
                        },
                        link: {
                            value: '{colors.slate.dark.2}',
                        },
                        bold: {
                            value: '{colors.slate.dark.9}',
                        },
                        counter: {
                            value: '{colors.slate.dark.5}',
                        },
                        bullet: {
                            value: '{colors.slate.dark.3}',
                        },
                        hrBorder: {
                            value: '{colors.slate.dark.2}',
                        },
                        quote: {
                            value: '{colors.slate.dark.9}',
                        },
                        quoteBorder: {
                            value: '{colors.slate.dark.2}',
                        },
                        caption: {
                            value: '{colors.slate.dark.5}',
                        },
                        kbd: {
                            value: '{colors.slate.dark.9}',
                        },
                        kbdShadow: {
                            // Expects an RGB value
                            value: '0 0 0',
                        },
                        code: {
                            value: '{colors.slate.dark.9}',
                        },
                        preCode: {
                            value: '{colors.slate.dark.2}',
                        },
                        preBg: {
                            value: '{colors.slate.dark.8}',
                        },
                        thBorder: {
                            value: '{colors.slate.dark.3}',
                        },
                        tdBorder: {
                            value: '{colors.slate.dark.2}',
                        },
                    },
                },
            },
            tokens: {
                colors: {
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
                // sizes: {
                //   /** xs: 4 */
                //   xs: { value: '4' },
                //   /** sm: 8 */
                //   sm: { value: '8' },
                //   /** md: 16 */
                //   md: { value: '16' },
                //   /** lg: 24 */
                //   lg: { value: '24' },
                //   /** xl: 32 */
                //   xl: { value: '32' },
                //   /** xxl: 40 */
                //   xxl: { value: '40' },
                // },
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
