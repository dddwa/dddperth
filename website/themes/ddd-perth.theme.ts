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
    },
  },
})

// Export legacy 2023 token mappings for backward compatibility during migration
// TODO: Remove these once migration is complete
export const legacy2023Tokens = {
  '2023-green': '#008554',
  '2023-orange': '#F89A1C',
  '2023-pink': '#DA459C',
  '2023-gray': '#58595B',
  '2023-red': '#880007',
  '2023-accessible-orange': '#D97F07',
  '2023-black': '#1d1d1d',
  '2023-white-i': '#FCFCFC',
  '2023-white-ii': '#F5F5F5',
  '2023-gray-light': '#C8C8C8',
  '2023-gray-light-ii': '#EAEAEA',
}
