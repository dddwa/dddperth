/**
 * Theme Builder
 *
 * Transforms theme definitions into Panda CSS token configuration.
 * This file is owned by upstream - downstream forks should not modify it.
 */

import type { StatusColorGroup, ThemeDefinition, ThemeTokenValue } from './base.theme'

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
 * Builds a semantic-token value object that swaps between light + dark at runtime.
 * `base` is the light value (Panda's `_light` condition matches `:where(:root, .light)`,
 * which also matches a bare `:root`, so base values must be the light variant to
 * win the cascade when no class is set). `_dark` activates when `<html>` has the
 * `dark` class (set by the toggle / entry script).
 */
function semanticTokenValue(dark: ThemeTokenValue, light: ThemeTokenValue) {
  return {
    value: {
      base: light.value,
      _dark: dark.value,
    },
  }
}

function statusGroupTokens(prefix: string, group: StatusColorGroup) {
  return {
    [`${prefix}.bg`]: tokenValue(group.bg),
    [`${prefix}.fg`]: tokenValue(group.fg),
    [`${prefix}.border`]: tokenValue(group.border),
    [`${prefix}.emphasis`]: tokenValue(group.emphasis),
  }
}

function semanticStatusGroupTokens(prefix: string, dark: StatusColorGroup, light: StatusColorGroup) {
  return {
    [`${prefix}.bg`]: semanticTokenValue(dark.bg, light.bg),
    [`${prefix}.fg`]: semanticTokenValue(dark.fg, light.fg),
    [`${prefix}.border`]: semanticTokenValue(dark.border, light.border),
    [`${prefix}.emphasis`]: semanticTokenValue(dark.emphasis, light.emphasis),
  }
}

/**
 * Creates Panda CSS token configuration from a theme definition.
 *
 * Used for non-color tokens (borders, shadows). Colors live in semantic tokens
 * via `createThemeColorSemanticTokens` so they can swap between dark + light.
 */
export function createThemeTokens(theme: ThemeDefinition) {
  return {
    borders: {
      default: tokenValue(theme.borders.default),
      subtle: tokenValue(theme.borders.subtle),
      emphasis: tokenValue(theme.borders.emphasis),
      'admin-subtle': tokenValue(theme.borders.adminSubtle),
      'admin-emphasis': tokenValue(theme.borders.adminEmphasis),
    },
    shadows: {
      'focus-ring': tokenValue(theme.shadows.focusRing),
    },
  }
}

/**
 * Creates Panda CSS semantic color tokens that hold both a dark and light
 * value. The active theme is selected at runtime via the `_light` condition
 * (configured in panda.config.ts to match `[data-theme=light]` or the
 * `prefers-color-scheme: light` media query when no explicit override is set).
 */
export function createThemeColorSemanticTokens(darkTheme: ThemeDefinition, lightTheme: ThemeDefinition) {
  const d = darkTheme.colors
  const l = lightTheme.colors

  return {
    // Brand colors
    'brand.primary': semanticTokenValue(d.brand.primary, l.brand.primary),
    'brand.secondary': semanticTokenValue(d.brand.secondary, l.brand.secondary),
    'brand.accent': semanticTokenValue(d.brand.accent, l.brand.accent),

    // Surface colors
    'surface.body': semanticTokenValue(d.surface.body, l.surface.body),
    'surface.hero': semanticTokenValue(d.surface.hero, l.surface.hero),
    'surface.hero-alt': semanticTokenValue(d.surface.heroAlt, l.surface.heroAlt),
    'surface.header': semanticTokenValue(d.surface.header, l.surface.header),
    'surface.footer': semanticTokenValue(d.surface.footer, l.surface.footer),
    'surface.drawer': semanticTokenValue(d.surface.drawer, l.surface.drawer),
    'surface.card': semanticTokenValue(d.surface.card, l.surface.card),
    'surface.card-alt': semanticTokenValue(d.surface.cardAlt, l.surface.cardAlt),
    'surface.elevated': semanticTokenValue(d.surface.elevated, l.surface.elevated),

    // Text colors
    'text.primary': semanticTokenValue(d.text.primary, l.text.primary),
    'text.secondary': semanticTokenValue(d.text.secondary, l.text.secondary),
    'text.on-brand': semanticTokenValue(d.text.onBrand, l.text.onBrand),
    'text.highlight': semanticTokenValue(d.text.highlight, l.text.highlight),
    'text.muted': semanticTokenValue(d.text.muted, l.text.muted),

    // Border colors
    'border.default': semanticTokenValue(d.border.default, l.border.default),
    'border.subtle': semanticTokenValue(d.border.subtle, l.border.subtle),
    'border.emphasis': semanticTokenValue(d.border.emphasis, l.border.emphasis),
    'border.sponsor': semanticTokenValue(d.border.sponsor, l.border.sponsor),

    // Gradient colors (individual stops)
    'gradient.hero-start': semanticTokenValue(d.gradient.heroStart, l.gradient.heroStart),
    'gradient.hero-end': semanticTokenValue(d.gradient.heroEnd, l.gradient.heroEnd),
    'gradient.cta-start': semanticTokenValue(d.gradient.ctaStart, l.gradient.ctaStart),
    'gradient.cta-mid': semanticTokenValue(d.gradient.ctaMid, l.gradient.ctaMid),
    'gradient.cta-end': semanticTokenValue(d.gradient.ctaEnd, l.gradient.ctaEnd),

    // Sponsor tier colors
    'sponsor.platinum': semanticTokenValue(d.sponsor.platinum, l.sponsor.platinum),
    'sponsor.gold': semanticTokenValue(d.sponsor.gold, l.sponsor.gold),
    'sponsor.silver': semanticTokenValue(d.sponsor.silver, l.sponsor.silver),
    'sponsor.bronze': semanticTokenValue(d.sponsor.bronze, l.sponsor.bronze),
    'sponsor.room': semanticTokenValue(d.sponsor.room, l.sponsor.room),
    'sponsor.digital': semanticTokenValue(d.sponsor.digital, l.sponsor.digital),
    'sponsor.community': semanticTokenValue(d.sponsor.community, l.sponsor.community),

    // Interactive state colors
    'interactive.highlight': semanticTokenValue(d.interactive.highlight, l.interactive.highlight),
    'interactive.active': semanticTokenValue(d.interactive.active, l.interactive.active),
    'interactive.focus': semanticTokenValue(d.interactive.focus, l.interactive.focus),

    // Overlay colors
    'overlay.subtle': semanticTokenValue(d.overlay.subtle, l.overlay.subtle),
    'overlay.moderate': semanticTokenValue(d.overlay.moderate, l.overlay.moderate),
    'overlay.strong': semanticTokenValue(d.overlay.strong, l.overlay.strong),
    'overlay.scrim': semanticTokenValue(d.overlay.scrim, l.overlay.scrim),
    'overlay.active-row-start': semanticTokenValue(d.overlay.activeRowStart, l.overlay.activeRowStart),
    'overlay.active-row-end': semanticTokenValue(d.overlay.activeRowEnd, l.overlay.activeRowEnd),

    // Status colors
    ...semanticStatusGroupTokens('status.success', d.status.success, l.status.success),
    ...semanticStatusGroupTokens('status.warning', d.status.warning, l.status.warning),
    ...semanticStatusGroupTokens('status.danger', d.status.danger, l.status.danger),
    ...semanticStatusGroupTokens('status.info', d.status.info, l.status.info),

    // Admin neutral scale
    'admin.50': semanticTokenValue(d.admin['50'], l.admin['50']),
    'admin.100': semanticTokenValue(d.admin['100'], l.admin['100']),
    'admin.200': semanticTokenValue(d.admin['200'], l.admin['200']),
    'admin.300': semanticTokenValue(d.admin['300'], l.admin['300']),
    'admin.400': semanticTokenValue(d.admin['400'], l.admin['400']),
    'admin.500': semanticTokenValue(d.admin['500'], l.admin['500']),
    'admin.600': semanticTokenValue(d.admin['600'], l.admin['600']),
    'admin.700': semanticTokenValue(d.admin['700'], l.admin['700']),
    'admin.800': semanticTokenValue(d.admin['800'], l.admin['800']),
    'admin.900': semanticTokenValue(d.admin['900'], l.admin['900']),
  }
}

/**
 * Creates semantic token mappings for easier usage patterns
 * These provide aliases and derived values for common use cases.
 *
 * These are alias-only: each value references another semantic token via
 * `{colors.x}`, so the alias inherits the dark/light swap automatically.
 */
export function createSemanticTokens(_theme: ThemeDefinition) {
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
