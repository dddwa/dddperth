/**
 * Theme Builder
 *
 * Transforms theme definitions into Panda CSS token configuration.
 * This file is owned by upstream - downstream forks should not modify it.
 */

import type { ThemeDefinition, ThemeTokenValue } from './base.theme'

/**
 * Helper to create a theme definition with type safety
 */
export function defineTheme(theme: ThemeDefinition): ThemeDefinition {
  return theme
}

/**
 * Converts a theme token value to Panda CSS token format
 */
function tokenValue(token: ThemeTokenValue) {
  return { value: token.value }
}

/**
 * Creates Panda CSS token configuration from a theme definition
 */
export function createThemeTokens(theme: ThemeDefinition) {
  return {
    colors: {
      // Brand colors
      'brand.primary': tokenValue(theme.colors.brand.primary),
      'brand.secondary': tokenValue(theme.colors.brand.secondary),
      'brand.accent': tokenValue(theme.colors.brand.accent),

      // Surface colors
      'surface.body': tokenValue(theme.colors.surface.body),
      'surface.hero': tokenValue(theme.colors.surface.hero),
      'surface.hero-alt': tokenValue(theme.colors.surface.heroAlt),
      'surface.header': tokenValue(theme.colors.surface.header),
      'surface.footer': tokenValue(theme.colors.surface.footer),
      'surface.card': tokenValue(theme.colors.surface.card),
      'surface.card-alt': tokenValue(theme.colors.surface.cardAlt),
      'surface.elevated': tokenValue(theme.colors.surface.elevated),

      // Text colors
      'text.primary': tokenValue(theme.colors.text.primary),
      'text.secondary': tokenValue(theme.colors.text.secondary),
      'text.on-brand': tokenValue(theme.colors.text.onBrand),
      'text.highlight': tokenValue(theme.colors.text.highlight),
      'text.muted': tokenValue(theme.colors.text.muted),

      // Border colors
      'border.default': tokenValue(theme.colors.border.default),
      'border.subtle': tokenValue(theme.colors.border.subtle),
      'border.emphasis': tokenValue(theme.colors.border.emphasis),

      // Gradient colors (individual stops)
      'gradient.hero-start': tokenValue(theme.colors.gradient.heroStart),
      'gradient.hero-end': tokenValue(theme.colors.gradient.heroEnd),
      'gradient.cta-start': tokenValue(theme.colors.gradient.ctaStart),
      'gradient.cta-mid': tokenValue(theme.colors.gradient.ctaMid),
      'gradient.cta-end': tokenValue(theme.colors.gradient.ctaEnd),

      // Sponsor tier colors
      'sponsor.platinum': tokenValue(theme.colors.sponsor.platinum),
      'sponsor.gold': tokenValue(theme.colors.sponsor.gold),
      'sponsor.silver': tokenValue(theme.colors.sponsor.silver),
      'sponsor.bronze': tokenValue(theme.colors.sponsor.bronze),
      'sponsor.room': tokenValue(theme.colors.sponsor.room),
      'sponsor.digital': tokenValue(theme.colors.sponsor.digital),
      'sponsor.community': tokenValue(theme.colors.sponsor.community),

      // Interactive state colors
      'interactive.highlight': tokenValue(theme.colors.interactive.highlight),
      'interactive.active': tokenValue(theme.colors.interactive.active),
      'interactive.focus': tokenValue(theme.colors.interactive.focus),

      // Overlay colors
      'overlay.subtle': tokenValue(theme.colors.overlay.subtle),
      'overlay.moderate': tokenValue(theme.colors.overlay.moderate),
      'overlay.strong': tokenValue(theme.colors.overlay.strong),
    },
  }
}

/**
 * Creates semantic token mappings for easier usage patterns
 * These provide aliases and derived values for common use cases
 */
export function createSemanticTokens(theme: ThemeDefinition) {
  return {
    colors: {
      // Convenience aliases for common patterns
      'bg.body': { value: '{colors.surface.body}' },
      'bg.hero': { value: '{colors.surface.hero}' },
      'bg.card': { value: '{colors.surface.card}' },

      // Button semantic tokens
      'button.primary.bg': { value: '{colors.brand.primary}' },
      'button.primary.text': { value: '{colors.text.on-brand}' },
      'button.secondary.bg': { value: '{colors.brand.secondary}' },
      'button.secondary.text': { value: '{colors.text.on-brand}' },

      // Link semantic tokens
      'link.default': { value: '{colors.text.highlight}' },
      'link.hover': { value: '{colors.interactive.highlight}' },
    },
  }
}

/**
 * Creates gradient preset configurations
 * Note: These are for documentation - actual gradients are composed in components
 */
export function getGradientPresets(theme: ThemeDefinition) {
  return {
    hero: `linear-gradient(to bottom, ${theme.colors.gradient.heroStart.value}, ${theme.colors.gradient.heroEnd.value})`,
    cta: `linear-gradient(125deg, ${theme.colors.gradient.ctaStart.value}, ${theme.colors.gradient.ctaMid.value}, ${theme.colors.gradient.ctaEnd.value})`,
  }
}
