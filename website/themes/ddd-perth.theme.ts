/**
 * DDD Perth Conference Theme
 *
 * This theme captures the DDD Perth brand colors and visual identity.
 * Downstream forks should create their own theme file based on this structure.
 */

import { defineTheme } from './theme-builder'

export const dddPerthTheme = defineTheme({
  colors: {
    // Brand colors - DDD Perth's identity colors
    brand: {
      primary: {
        value: '#008554',
        description: 'DDD Perth green - primary brand color from 2023',
      },
      secondary: {
        value: '#DA459C',
        description: 'DDD Perth pink - secondary brand color from 2023',
      },
      accent: {
        value: '#F89A1C',
        description: 'DDD Perth orange - accent color from 2023',
      },
    },

    // Surface colors - backgrounds for different sections
    surface: {
      body: {
        value: '#0E0E43',
        description: 'Main body background - dark blue',
      },
      hero: {
        value: '#070727',
        description: 'Hero section background - very dark blue',
      },
      heroAlt: {
        value: '#0E0E43',
        description: 'Hero section gradient end - dark blue',
      },
      header: {
        value: '#070727',
        description: 'Header background - very dark blue',
      },
      footer: {
        value: '#0E0E43',
        description: 'Footer background - dark blue',
      },
      drawer: {
        value: '#070727',
        description:
          'Mobile drawer panel - very dark blue. Always brand-dark so the overlay reads cleanly against any underlying surface.',
      },
      card: {
        value: '#1F1F4E',
        description: 'Card/panel background - medium dark blue',
      },
      cardAlt: {
        value: '#151544',
        description: 'Alternate card background - slightly lighter dark blue',
      },
      elevated: {
        value: '#1F1F4E',
        description: 'Elevated surfaces like modals - medium dark blue',
      },
    },

    // Text colors
    text: {
      primary: {
        value: '#FCFCFC',
        description: 'Primary text color - near white',
      },
      secondary: {
        value: '#C2C2FF',
        description: 'Secondary text color - light purple',
      },
      onBrand: {
        value: '#FFFFFF',
        description: 'Text on brand-colored backgrounds - pure white',
      },
      highlight: {
        value: '#8282FB',
        description: 'Highlighted text and links - medium purple',
      },
      muted: {
        value: '#9c9cd7',
        description: 'Muted/less important text - muted purple',
      },
    },

    // Border colors
    border: {
      default: {
        value: '#0D0D3F',
        description: 'Default border color - very dark blue',
      },
      subtle: {
        value: '#8D8DFF33',
        description: 'Subtle border with transparency - light purple, 20% opacity',
      },
      emphasis: {
        value: '#8D8DFF',
        description: 'Emphasized border - light purple',
      },
      sponsor: {
        value: '#0D0D3F',
        description: 'Sponsor tile border - very dark blue',
      },
    },

    // Gradient colors
    gradient: {
      heroStart: {
        value: '#070727',
        description: 'Hero gradient start - very dark blue',
      },
      heroEnd: {
        value: '#0E0E43',
        description: 'Hero gradient end - dark blue',
      },
      ctaStart: {
        value: '#520030',
        description: 'CTA gradient start - dark magenta',
      },
      ctaMid: {
        value: '#FF52B7',
        description: 'CTA gradient middle - bright pink',
      },
      ctaEnd: {
        value: '#FF8273',
        description: 'CTA gradient end - coral pink',
      },
    },

    // Sponsor tier backgrounds - each tier has a distinct color
    sponsor: {
      platinum: {
        value: '#496F7F',
        description: 'Platinum sponsor tier - teal blue',
      },
      gold: {
        value: '#453927',
        description: 'Gold sponsor tier - bronze brown',
      },
      silver: {
        value: '#2A3251',
        description: 'Silver sponsor tier - dark slate blue',
      },
      bronze: {
        value: '#452927',
        description: 'Bronze sponsor tier - dark reddish brown',
      },
      room: {
        value: '#1F1F4E',
        description: 'Room sponsor - medium dark blue',
      },
      digital: {
        value: '#371F4E',
        description: 'Digital sponsor - dark purple',
      },
      community: {
        value: '#134343',
        description: 'Community/other sponsors - dark teal',
      },
    },

    // Interactive state colors
    interactive: {
      highlight: {
        value: '#8282FB',
        description: 'Hover/highlight state - medium purple',
      },
      active: {
        value: '#C2C2FF',
        description: 'Active/pressed state - light purple',
      },
      focus: {
        value: '#8D8DFF',
        description: 'Focus ring - light purple',
      },
    },

    // Overlay colors - for semi-transparent effects
    overlay: {
      subtle: {
        value: '#00BA8D4A',
        description: 'Subtle overlay - green with ~29% opacity',
      },
      moderate: {
        value: '#FF00E91A',
        description: 'Moderate overlay - magenta with ~10% opacity',
      },
      strong: {
        value: '#FFFFFF2A',
        description: 'Strong overlay - white with ~16% opacity',
      },
      scrim: {
        value: 'rgba(0, 0, 0, 0.6)',
        description: 'Modal/drawer scrim - darkens content underneath',
      },
      activeRowStart: {
        value: '#00BA8D4A',
        description: 'Active row gradient start - brand green at ~29% opacity (matches former overlay.subtle)',
      },
      activeRowEnd: {
        value: '#FF00E91A',
        description: 'Active row gradient end - brand pink at ~10% opacity (matches former overlay.moderate)',
      },
    },

    // Status colors - admin / validation / alert UI
    status: {
      success: {
        bg: { value: '#dcfce7', description: 'Success bg - light green' },
        fg: { value: '#14532d', description: 'Success fg - dark green' },
        border: { value: '#bbf7d0', description: 'Success border - light green' },
        emphasis: { value: '#15803d', description: 'Success emphasis - mid green' },
      },
      warning: {
        bg: { value: '#fff7ed', description: 'Warning bg - light orange' },
        fg: { value: '#7c2d12', description: 'Warning fg - dark orange' },
        border: { value: '#fed7aa', description: 'Warning border - light orange' },
        emphasis: { value: '#c2410c', description: 'Warning emphasis - mid orange' },
      },
      danger: {
        bg: { value: '#fef2f2', description: 'Danger bg - light red' },
        fg: { value: '#7f1d1d', description: 'Danger fg - dark red' },
        border: { value: '#fecaca', description: 'Danger border - light red' },
        emphasis: { value: '#b91c1c', description: 'Danger emphasis - mid red' },
      },
      info: {
        bg: { value: '#eff6ff', description: 'Info bg - light blue' },
        fg: { value: '#1e3a8a', description: 'Info fg - dark blue' },
        border: { value: '#bfdbfe', description: 'Info border - light blue' },
        emphasis: { value: '#1d4ed8', description: 'Info emphasis - mid blue' },
      },
    },

    // Admin neutral scale - mirrors a 50-900 grey palette for admin UI chrome
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
      description: 'Focus ring shadow using interactive focus colour at ~20% opacity',
    },
  },
})
