# DDD Conference Theming System

This directory contains the theming infrastructure for the DDD conference website.

## For Downstream Forks

If you're forking this codebase for your own conference, follow these steps:

### 1. Create Your Theme File

Create a new file `themes/your-conference-name.theme.ts` based on the DDD Perth theme:

```typescript
import { defineTheme } from './theme-builder'

export const yourConferenceTheme = defineTheme({
  colors: {
    // Brand colors - these appear in buttons, CTAs, and key UI elements
    brand: {
      primary: { value: '#YOUR_PRIMARY_COLOR' },
      secondary: { value: '#YOUR_SECONDARY_COLOR' },
      accent: { value: '#YOUR_ACCENT_COLOR' },
    },

    // Surface colors - backgrounds for different sections
    surface: {
      body: { value: '#YOUR_BODY_BG' },
      hero: { value: '#YOUR_HERO_BG' },
      heroAlt: { value: '#YOUR_HERO_GRADIENT_END' },
      header: { value: '#YOUR_HEADER_BG' },
      footer: { value: '#YOUR_FOOTER_BG' },
      card: { value: '#YOUR_CARD_BG' },
      cardAlt: { value: '#YOUR_CARD_ALT_BG' },
      elevated: { value: '#YOUR_ELEVATED_SURFACE' },
    },

    // Text colors
    text: {
      primary: { value: '#YOUR_PRIMARY_TEXT' },
      secondary: { value: '#YOUR_SECONDARY_TEXT' },
      onBrand: { value: '#TEXT_ON_BRAND_COLORS' },
      highlight: { value: '#HIGHLIGHTED_TEXT' },
      muted: { value: '#MUTED_TEXT' },
    },

    // Border colors
    border: {
      default: { value: '#YOUR_BORDER_COLOR' },
      subtle: { value: '#YOUR_SUBTLE_BORDER' },
      emphasis: { value: '#YOUR_EMPHASIS_BORDER' },
    },

    // Gradient colors
    gradient: {
      heroStart: { value: '#HERO_GRADIENT_START' },
      heroEnd: { value: '#HERO_GRADIENT_END' },
      ctaStart: { value: '#CTA_GRADIENT_START' },
      ctaMid: { value: '#CTA_GRADIENT_MID' },
      ctaEnd: { value: '#CTA_GRADIENT_END' },
    },

    // Sponsor tier backgrounds
    sponsor: {
      platinum: { value: '#PLATINUM_TIER_COLOR' },
      gold: { value: '#GOLD_TIER_COLOR' },
      silver: { value: '#SILVER_TIER_COLOR' },
      bronze: { value: '#BRONZE_TIER_COLOR' },
      room: { value: '#ROOM_SPONSOR_COLOR' },
      digital: { value: '#DIGITAL_SPONSOR_COLOR' },
      community: { value: '#COMMUNITY_SPONSOR_COLOR' },
    },

    // Interactive state colors
    interactive: {
      highlight: { value: '#HOVER_HIGHLIGHT_COLOR' },
      active: { value: '#ACTIVE_STATE_COLOR' },
      focus: { value: '#FOCUS_RING_COLOR' },
    },
  }
})
```

### 2. Update the Theme Configuration

Edit `website/app/theme.config.ts`:

```typescript
// Change this line to import your theme
export { yourConferenceTheme as currentTheme } from '../themes/your-conference-name.theme'
```

### 3. Rebuild

Run `pnpm build` to regenerate the styled-system with your new colors.

## Architecture

- **`base.theme.ts`**: Defines the semantic token structure (the "contract")
- **`theme-builder.ts`**: Transforms theme definitions into Panda CSS configuration
- **`ddd-perth.theme.ts`**: DDD Perth's color palette (reference implementation)
- **`../app/theme.config.ts`**: Active theme selection (git-ignored or clearly marked for customization)

## Pulling Upstream Updates

The theme system is designed to minimize merge conflicts:

- **You own**: Your theme file (`your-conference-name.theme.ts`) and `theme.config.ts`
- **Upstream owns**: `base.theme.ts`, `theme-builder.ts`, all components

When pulling updates:
1. Upstream changes to token structure will appear in `base.theme.ts`
2. You'll get TypeScript errors if your theme is missing new required tokens
3. Your theme file and selection won't have conflicts
4. Components automatically use your colors via semantic tokens

## Token Philosophy

All tokens are **purpose-based**, not color-based. Never reference a token like "purple" or "blue" - instead use semantic names like "brand.primary" or "text.highlight".

This allows different conferences to use completely different color schemes while sharing the same components.
