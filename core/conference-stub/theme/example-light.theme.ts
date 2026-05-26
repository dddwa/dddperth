/**
 * DevConf Example — light theme.
 *
 * Light-mode companion to example.theme.ts. Surfaces use warm off-whites
 * with subtle teal hints so the DevConf identity carries across modes.
 * Brand teal/amber are darkened just enough to maintain AA contrast on
 * light backgrounds.
 */

import { defineTheme } from '../../website/themes/theme-builder'

export const exampleLightTheme = defineTheme({
    colors: {
        brand: {
            primary: { value: '#0f766e', description: 'DevConf teal — darkened for AA contrast on light surfaces' },
            secondary: { value: '#334155', description: 'DevConf slate — darkened for AA contrast on light surfaces' },
            accent: { value: '#b45309', description: 'DevConf amber — darkened for AA contrast on light surfaces' },
        },

        surface: {
            body: { value: '#f8fafc', description: 'Main body background — light slate' },
            hero: { value: '#f1f5f9', description: 'Hero section background — soft slate' },
            heroAlt: { value: '#e2e8f0', description: 'Hero gradient end — pale slate' },
            header: { value: '#ffffff', description: 'Header background — white' },
            footer: { value: '#0f172a', description: 'Footer background — deep slate (stays dark for contrast)' },
            drawer: { value: '#020617', description: 'Mobile drawer — near-black so overlay reads cleanly' },
            card: { value: '#ffffff', description: 'Card/panel background — white' },
            cardAlt: { value: '#f1f5f9', description: 'Alternate card background — soft slate' },
            elevated: { value: '#ffffff', description: 'Elevated surfaces like modals — white' },
        },

        text: {
            primary: { value: '#0f172a', description: 'Primary text — deep slate' },
            secondary: { value: '#334155', description: 'Secondary text — slate' },
            onBrand: { value: '#ffffff', description: 'Text on brand-coloured backgrounds — white on teal' },
            highlight: { value: '#0f766e', description: 'Highlighted text and links — dark teal' },
            muted: { value: '#64748b', description: 'Muted text — medium slate' },
        },

        border: {
            default: { value: '#e2e8f0', description: 'Default border — pale slate' },
            subtle: { value: '#0f766e1a', description: 'Subtle border — teal at ~10% opacity' },
            emphasis: { value: '#94a3b8', description: 'Emphasized border — slate' },
            sponsor: { value: '#e2e8f0', description: 'Sponsor tile border — pale slate' },
        },

        gradient: {
            heroStart: { value: '#f1f5f9', description: 'Hero gradient start — soft slate' },
            heroEnd: { value: '#e2e8f0', description: 'Hero gradient end — pale slate' },
            ctaStart: { value: '#0f766e', description: 'CTA gradient start — dark teal' },
            ctaMid: { value: '#14b8a6', description: 'CTA gradient middle — brand teal' },
            ctaEnd: { value: '#5eead4', description: 'CTA gradient end — light teal' },
        },

        sponsor: {
            platinum: { value: '#cbd5e1', description: 'Platinum tier — light slate' },
            gold: { value: '#fef3c7', description: 'Gold tier — pale amber' },
            silver: { value: '#e2e8f0', description: 'Silver tier — pale slate' },
            bronze: { value: '#fed7aa', description: 'Bronze tier — pale orange-amber' },
            room: { value: '#f1f5f9', description: 'Room sponsor — soft slate' },
            digital: { value: '#ccfbf1', description: 'Digital sponsor — pale teal' },
            community: { value: '#a7f3d0', description: 'Community sponsor — pale emerald-teal' },
        },

        interactive: {
            highlight: { value: '#0f766e', description: 'Hover/highlight — dark teal' },
            active: { value: '#0d9488', description: 'Active/pressed — mid teal' },
            focus: { value: '#14b8a6', description: 'Focus ring — brand teal' },
        },

        overlay: {
            subtle: { value: '#0f766e0d', description: 'Subtle overlay — teal at ~5% opacity' },
            moderate: { value: '#0f766e1a', description: 'Moderate overlay — teal at ~10% opacity' },
            strong: { value: '#0f172a1a', description: 'Strong overlay — slate at ~10% opacity' },
            scrim: { value: 'rgba(15, 23, 42, 0.4)', description: 'Modal/drawer scrim — slate at 40%' },
            activeRowStart: { value: '#0f766e0d', description: 'Active row gradient start — teal at ~5%' },
            activeRowEnd: { value: '#b453090d', description: 'Active row gradient end — amber at ~5%' },
        },

        status: {
            success: {
                bg: { value: '#dcfce7', description: 'Success bg — light green' },
                fg: { value: '#14532d', description: 'Success fg — dark green' },
                border: { value: '#bbf7d0', description: 'Success border — light green' },
                emphasis: { value: '#15803d', description: 'Success emphasis — mid green' },
            },
            warning: {
                bg: { value: '#fff7ed', description: 'Warning bg — light orange' },
                fg: { value: '#7c2d12', description: 'Warning fg — dark orange' },
                border: { value: '#fed7aa', description: 'Warning border — light orange' },
                emphasis: { value: '#c2410c', description: 'Warning emphasis — mid orange' },
            },
            danger: {
                bg: { value: '#fef2f2', description: 'Danger bg — light red' },
                fg: { value: '#7f1d1d', description: 'Danger fg — dark red' },
                border: { value: '#fecaca', description: 'Danger border — light red' },
                emphasis: { value: '#b91c1c', description: 'Danger emphasis — mid red' },
            },
            info: {
                bg: { value: '#ecfeff', description: 'Info bg — light cyan' },
                fg: { value: '#164e63', description: 'Info fg — dark cyan' },
                border: { value: '#a5f3fc', description: 'Info border — light cyan' },
                emphasis: { value: '#0e7490', description: 'Info emphasis — mid cyan' },
            },
        },

        admin: {
            '50': { value: '#f9fafb', description: 'Admin neutral 50' },
            '100': { value: '#f3f4f6', description: 'Admin neutral 100' },
            '200': { value: '#e5e7eb', description: 'Admin neutral 200' },
            '300': { value: '#d1d5db', description: 'Admin neutral 300' },
            '400': { value: '#9ca3af', description: 'Admin neutral 400' },
            '500': { value: '#6b7280', description: 'Admin neutral 500' },
            '600': { value: '#4b5563', description: 'Admin neutral 600' },
            '700': { value: '#374151', description: 'Admin neutral 700' },
            '800': { value: '#1f2937', description: 'Admin neutral 800' },
            '900': { value: '#111827', description: 'Admin neutral 900' },
        },
    },

    borders: {
        default: { value: '1px solid {colors.border.default}', description: '1px default border' },
        subtle: { value: '1px solid {colors.border.subtle}', description: '1px subtle border' },
        emphasis: { value: '2px solid {colors.border.emphasis}', description: '2px emphasised border' },
        adminSubtle: { value: '1px solid {colors.admin.200}', description: '1px admin neutral border' },
        adminEmphasis: { value: '2px solid {colors.admin.300}', description: '2px admin neutral border' },
    },

    shadows: {
        focusRing: {
            value: '0 0 0 3px {colors.interactive.focus}33',
            description: 'Focus ring using interactive focus colour at ~20% opacity',
        },
    },
})
