/**
 * DevConf Example — dark theme.
 *
 * Neutral teal + slate palette. Picked to be visibly different from any
 * real DDD conference (Perth's electric blue/pink, etc.) so a standalone
 * core build is obviously "the example", not impersonating a real brand.
 *
 * Forks copy this folder via the /new-conference skill and replace the
 * teal/slate hex values with their own. The token *shape* must stay in
 * lockstep with `ThemeDefinition` in website/themes/base.theme.ts — if
 * core adds a required token here, this stub must add it too or the
 * standalone build breaks.
 */

import { defineTheme } from '../../website/themes/theme-builder'

export const exampleTheme = defineTheme({
    colors: {
        brand: {
            primary: { value: '#14b8a6', description: 'DevConf teal — primary brand colour' },
            secondary: { value: '#475569', description: 'DevConf slate — secondary brand colour' },
            accent: { value: '#f59e0b', description: 'DevConf amber — accent for CTAs' },
        },

        surface: {
            body: { value: '#0f172a', description: 'Main body background — deep slate' },
            hero: { value: '#020617', description: 'Hero section background — near-black slate' },
            heroAlt: { value: '#0f172a', description: 'Hero gradient end — deep slate' },
            header: { value: '#020617', description: 'Header background — near-black slate' },
            footer: { value: '#0f172a', description: 'Footer background — deep slate' },
            drawer: { value: '#020617', description: 'Mobile drawer — near-black so overlay reads cleanly' },
            card: { value: '#1e293b', description: 'Card/panel background — mid slate' },
            cardAlt: { value: '#172033', description: 'Alternate card background — slightly darker' },
            elevated: { value: '#1e293b', description: 'Elevated surfaces like modals — mid slate' },
        },

        text: {
            primary: { value: '#f8fafc', description: 'Primary text — near white' },
            secondary: { value: '#cbd5e1', description: 'Secondary text — light slate' },
            onBrand: { value: '#0f172a', description: 'Text on brand-coloured backgrounds — slate on teal' },
            highlight: { value: '#5eead4', description: 'Highlighted text and links — light teal' },
            muted: { value: '#94a3b8', description: 'Muted text — medium slate' },
        },

        border: {
            default: { value: '#1e293b', description: 'Default border — mid slate' },
            subtle: { value: '#5eead433', description: 'Subtle border — teal at ~20% opacity' },
            emphasis: { value: '#334155', description: 'Emphasized border — slate' },
            sponsor: { value: '#1e293b', description: 'Sponsor tile border — mid slate' },
        },

        gradient: {
            heroStart: { value: '#020617', description: 'Hero gradient start — near-black slate' },
            heroEnd: { value: '#0f172a', description: 'Hero gradient end — deep slate' },
            ctaStart: { value: '#0f766e', description: 'CTA gradient start — dark teal' },
            ctaMid: { value: '#14b8a6', description: 'CTA gradient middle — brand teal' },
            ctaEnd: { value: '#5eead4', description: 'CTA gradient end — light teal' },
        },

        sponsor: {
            platinum: { value: '#475569', description: 'Platinum tier — slate' },
            gold: { value: '#78350f', description: 'Gold tier — dark amber-brown' },
            silver: { value: '#334155', description: 'Silver tier — darker slate' },
            bronze: { value: '#451a03', description: 'Bronze tier — deep amber-brown' },
            room: { value: '#1e293b', description: 'Room sponsor — mid slate' },
            digital: { value: '#0f766e', description: 'Digital sponsor — dark teal' },
            community: { value: '#134e4a', description: 'Community sponsor — deep teal' },
        },

        interactive: {
            highlight: { value: '#5eead4', description: 'Hover/highlight — light teal' },
            active: { value: '#99f6e4', description: 'Active/pressed — paler teal' },
            focus: { value: '#14b8a6', description: 'Focus ring — brand teal' },
        },

        overlay: {
            subtle: { value: '#14b8a61a', description: 'Subtle overlay — teal at ~10% opacity' },
            moderate: { value: '#14b8a633', description: 'Moderate overlay — teal at ~20% opacity' },
            strong: { value: '#ffffff2a', description: 'Strong overlay — white at ~16% opacity' },
            scrim: { value: 'rgba(0, 0, 0, 0.6)', description: 'Modal/drawer scrim' },
            activeRowStart: { value: '#14b8a61a', description: 'Active row gradient start — teal at ~10%' },
            activeRowEnd: { value: '#f59e0b1a', description: 'Active row gradient end — amber at ~10%' },
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
