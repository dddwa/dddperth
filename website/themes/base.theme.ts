/**
 * Base Theme Token Structure
 *
 * This file defines the semantic token "contract" that all conference themes must implement.
 * It serves as documentation and type definition for the theming system.
 *
 * DO NOT modify this file in downstream forks - it's owned by upstream.
 * Create your own theme file (e.g., your-conference.theme.ts) that implements this structure.
 */

export interface ThemeTokenValue {
  value: string
  description?: string
}

/**
 * A status color group used for alerts, banners, validation messages, etc.
 * Each status provides a background, foreground (text), border and emphasis (button/accent) tone.
 */
export interface StatusColorGroup {
  bg: ThemeTokenValue
  fg: ThemeTokenValue
  border: ThemeTokenValue
  emphasis: ThemeTokenValue
}

/**
 * A neutral scale used for admin/chrome surfaces that need a fuller range than
 * the brand-coloured scale. Modeled on a 50/100/200/.../900 scale so admin UIs
 * built against the previous Tailwind/Park UI palette can map cleanly.
 */
export interface NeutralScale {
  '50': ThemeTokenValue
  '100': ThemeTokenValue
  '200': ThemeTokenValue
  '300': ThemeTokenValue
  '400': ThemeTokenValue
  '500': ThemeTokenValue
  '600': ThemeTokenValue
  '700': ThemeTokenValue
  '800': ThemeTokenValue
  '900': ThemeTokenValue
}

export interface ThemeDefinition {
  colors: {
    // Brand colors - primary identity colors used in CTAs, buttons, and key UI elements
    brand: {
      primary: ThemeTokenValue      // Main brand color - used for primary buttons, important CTAs
      secondary: ThemeTokenValue    // Secondary brand color - used for accents and secondary actions
      accent: ThemeTokenValue        // Tertiary accent color - used for highlights and decorative elements
    }

    // Surface colors - backgrounds for different sections and components
    surface: {
      body: ThemeTokenValue          // Main body background color
      hero: ThemeTokenValue          // Hero section background (can be gradient start)
      heroAlt: ThemeTokenValue       // Hero section alternate/gradient end
      header: ThemeTokenValue        // Header background
      footer: ThemeTokenValue        // Footer background
      card: ThemeTokenValue          // Card/panel background
      cardAlt: ThemeTokenValue       // Alternate card background for variety
      elevated: ThemeTokenValue      // Elevated surface (modals, dropdowns)
    }

    // Text colors - for different contexts and emphasis levels
    text: {
      primary: ThemeTokenValue       // Primary text color (body text)
      secondary: ThemeTokenValue     // Secondary text color (less important text)
      onBrand: ThemeTokenValue       // Text color when on brand-colored backgrounds
      highlight: ThemeTokenValue     // Highlighted text, important links
      muted: ThemeTokenValue         // Muted/disabled text
    }

    // Border colors - for dividers, outlines, and separators
    border: {
      default: ThemeTokenValue       // Default border color
      subtle: ThemeTokenValue        // Subtle border for light separation
      emphasis: ThemeTokenValue      // Emphasized border for focus/attention
      sponsor: ThemeTokenValue       // Sponsor tile border
    }

    // Gradient colors - for gradient backgrounds and effects
    gradient: {
      heroStart: ThemeTokenValue     // Hero gradient start color
      heroEnd: ThemeTokenValue       // Hero gradient end color
      ctaStart: ThemeTokenValue      // CTA button gradient start
      ctaMid: ThemeTokenValue        // CTA button gradient middle
      ctaEnd: ThemeTokenValue        // CTA button gradient end
    }

    // Sponsor tier backgrounds - different tiers have different background treatments
    sponsor: {
      platinum: ThemeTokenValue      // Platinum sponsor tier background
      gold: ThemeTokenValue          // Gold sponsor tier background
      silver: ThemeTokenValue        // Silver sponsor tier background
      bronze: ThemeTokenValue        // Bronze sponsor tier background
      room: ThemeTokenValue          // Room sponsor background
      digital: ThemeTokenValue       // Digital sponsor background
      community: ThemeTokenValue     // Community/other sponsor background
    }

    // Interactive state colors - for hover, active, focus states
    interactive: {
      highlight: ThemeTokenValue     // Hover/highlight state color
      active: ThemeTokenValue        // Active state color
      focus: ThemeTokenValue         // Focus ring color
    }

    // Overlay colors - semi-transparent overlays for effects
    overlay: {
      subtle: ThemeTokenValue        // Subtle overlay (low opacity)
      moderate: ThemeTokenValue      // Moderate overlay
      strong: ThemeTokenValue        // Strong overlay (higher opacity)
    }

    // Status colors - for alerts, banners, validation feedback (admin UI)
    status: {
      success: StatusColorGroup
      warning: StatusColorGroup
      danger: StatusColorGroup
      info: StatusColorGroup
    }

    // Admin neutral scale - for admin/chrome surfaces (mostly light backgrounds)
    admin: NeutralScale
  }

  // Border style tokens - reusable border declarations
  borders: {
    default: ThemeTokenValue        // Default 1px border using border.default colour
    subtle: ThemeTokenValue         // Subtle 1px border
    emphasis: ThemeTokenValue       // Emphasised 2px border
    adminSubtle: ThemeTokenValue    // 1px admin neutral border
    adminEmphasis: ThemeTokenValue  // 2px admin neutral border
  }

  // Shadow tokens
  shadows: {
    focusRing: ThemeTokenValue      // Focus outline shadow
  }
}

/**
 * Validates that a theme implements the required structure
 */
export function validateTheme(theme: ThemeDefinition): theme is ThemeDefinition {
  // TypeScript will enforce this at compile time, but we can add runtime checks if needed
  return true
}
