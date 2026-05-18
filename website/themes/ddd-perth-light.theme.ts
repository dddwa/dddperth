/**
 * DDD Perth Conference Theme - Light Mode
 *
 * Brand-tinted light counterpart to ddd-perth.theme.ts.
 * Surfaces use off-white with subtle indigo/lavender warmth so the DDD Perth
 * identity is still felt. Brand green/pink/orange are darkened just enough to
 * stay readable as foreground on light backgrounds (WCAG AA targeted).
 */

import { defineTheme } from './theme-builder'

export const dddPerthLightTheme = defineTheme({
  colors: {
    brand: {
      primary: {
        value: '#006B43',
        description: 'DDD Perth green - darkened for AA contrast on light surfaces',
      },
      secondary: {
        value: '#B8267E',
        description: 'DDD Perth pink - darkened for AA contrast on light surfaces',
      },
      accent: {
        value: '#C2710A',
        description: 'DDD Perth orange - darkened for AA contrast on light surfaces',
      },
    },

    surface: {
      body: {
        value: '#F5F5FB',
        description: 'Main body background - off-white with subtle indigo tint',
      },
      hero: {
        value: '#EAEAF5',
        description: 'Hero section background - light lavender tint',
      },
      heroAlt: {
        value: '#F5F5FB',
        description: 'Hero gradient end - off-white with indigo tint',
      },
      header: {
        // Was `#0A2F23` deep forest green, but the dark-strip-over-light-body
        // look was inconsistent with dark theme (where the header blends into
        // the body). Now we blend into body in both themes; nav text adapts via
        // `text.primary` instead of being locked to white.
        value: '#F5F5FB',
        description: 'Header background - same as body (blends, no chrome strip)',
      },
      footer: {
        // Was `#0A2F23` deep forest green. Now matches body so the footer
        // blends in the same way the header does. Logo + nav links flip to
        // `text.primary` so they stay readable on the off-white surface.
        value: '#F5F5FB',
        description: 'Footer background - same as body (blends, no chrome strip)',
      },
      drawer: {
        // Drawer panel keeps a brand-dark surface in both themes so the
        // overlay reads cleanly against any underlying surface.
        value: '#0A2F23',
        description: 'Mobile drawer panel - deep forest green (always brand-dark)',
      },
      card: {
        value: '#FFFFFF',
        description: 'Card/panel background - white',
      },
      cardAlt: {
        value: '#F0F0F8',
        description: 'Alternate card background - very light indigo',
      },
      elevated: {
        value: '#FFFFFF',
        description: 'Elevated surfaces (modals, dropdowns) - white',
      },
    },

    text: {
      primary: {
        value: '#0E0E43',
        description: 'Primary text - dark indigo (mirrors dark theme body bg)',
      },
      secondary: {
        value: '#3F3F77',
        description: 'Secondary text - mid indigo',
      },
      onBrand: {
        value: '#FFFFFF',
        description: 'Text on brand-coloured backgrounds - white (brand colours stay dark enough)',
      },
      highlight: {
        value: '#4F4FE6',
        description: 'Highlighted text and links - vivid indigo',
      },
      muted: {
        value: '#6B6BA3',
        description: 'Muted/less important text - muted indigo',
      },
    },

    border: {
      default: {
        value: '#D4D4E8',
        description: 'Default border - light indigo grey',
      },
      subtle: {
        value: '#0E0E4319',
        description: 'Subtle border - dark indigo at ~10% opacity',
      },
      emphasis: {
        value: '#4F4FE6',
        description: 'Emphasised border - vivid indigo',
      },
      sponsor: {
        value: '#D4D4E8',
        description: 'Sponsor tile border - light indigo grey',
      },
    },

    gradient: {
      heroStart: {
        value: '#EAEAF5',
        description: 'Hero gradient start - light lavender',
      },
      heroEnd: {
        value: '#F5F5FB',
        description: 'Hero gradient end - off-white with indigo tint',
      },
      ctaStart: {
        value: '#B8267E',
        description: 'CTA gradient start - darkened pink',
      },
      ctaMid: {
        value: '#E94FA0',
        description: 'CTA gradient middle - mid pink',
      },
      ctaEnd: {
        value: '#F58A6E',
        description: 'CTA gradient end - coral (kept warm)',
      },
    },

    sponsor: {
      platinum: {
        value: '#D6E2E8',
        description: 'Platinum sponsor tier - pale teal',
      },
      gold: {
        value: '#F5E8D2',
        description: 'Gold sponsor tier - pale bronze',
      },
      silver: {
        value: '#DDE0EC',
        description: 'Silver sponsor tier - pale slate',
      },
      bronze: {
        value: '#F0DBD7',
        description: 'Bronze sponsor tier - pale terracotta',
      },
      room: {
        value: '#E8E8F2',
        description: 'Room sponsor - pale indigo',
      },
      digital: {
        value: '#EADCF2',
        description: 'Digital sponsor - pale purple',
      },
      community: {
        value: '#D6E8E8',
        description: 'Community sponsor - pale teal-green',
      },
    },

    interactive: {
      highlight: {
        value: '#4F4FE6',
        description: 'Hover/highlight state - vivid indigo',
      },
      active: {
        value: '#3838C2',
        description: 'Active/pressed state - deeper indigo',
      },
      focus: {
        value: '#4F4FE6',
        description: 'Focus ring - vivid indigo',
      },
    },

    overlay: {
      subtle: {
        value: '#00855414',
        description: 'Subtle overlay - brand green at ~8% opacity',
      },
      moderate: {
        value: '#B8267E14',
        description: 'Moderate overlay - brand pink at ~8% opacity',
      },
      strong: {
        value: '#0E0E4314',
        description: 'Strong overlay - dark indigo at ~8% opacity (light theme keeps overlays gentle)',
      },
      scrim: {
        value: 'rgba(14, 14, 67, 0.45)',
        description: 'Modal/drawer scrim - dark indigo at 45% opacity reads on a light background',
      },
      activeRowStart: {
        value: '#00855426',
        description: 'Active row gradient start - brand green at ~15% opacity (visible tint on cream body)',
      },
      activeRowEnd: {
        value: '#B8267E1F',
        description: 'Active row gradient end - brand pink at ~12% opacity',
      },
    },

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
