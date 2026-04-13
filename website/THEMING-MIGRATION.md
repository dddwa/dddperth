# Theming Migration Guide

This document explains the theming system setup and provides guidance for completing the migration from hardcoded colors to semantic tokens.

## ✅ What's Been Completed

### 1. Theme Infrastructure (100% Complete)
- ✅ **`themes/base.theme.ts`** - Semantic token structure definition
- ✅ **`themes/theme-builder.ts`** - Theme transformation logic
- ✅ **`themes/ddd-perth.theme.ts`** - DDD Perth color palette
- ✅ **`app/theme.config.ts`** - Theme selection (downstream customization point)
- ✅ **`panda.config.ts`** - Integrated theme system + enabled `strictTokens: true`

### 2. Recipes (100% Complete)
- ✅ `app/recipes/button.ts` - All button variants use semantic tokens
- ✅ `app/recipes/nav-link.ts` - All nav-link variants use semantic tokens

### 3. Core Components (100% Complete)
- ✅ `app/root.tsx` - Body background uses `surface.body` token
- ✅ `app/components/acknowledgement.tsx` - All colors tokenized
- ✅ `app/components/footer/footer.tsx` - All colors tokenized
- ✅ `app/components/header/header.tsx` - All colors tokenized
- ✅ `app/components/hero/hero-panel.tsx` - All colors tokenized
- ✅ `app/components/page-components/SponsorSection.tsx` - All sponsor tier colors tokenized
- ✅ `app/components/page-components/important-dates.tsx` - Active/closed row colors tokenized

## ⚠️ What Remains

### Remaining TypeScript Errors

The `strictTokens: true` setting catches all remaining issues. Run `pnpm tsc --noEmit` to see them.

**Files with remaining errors** (mostly spacing tokens and route files):
- Various route files in `app/routes/`
- Some admin components
- Agenda/voting components
- A few utility components

**Common error types:**

1. **Spacing tokens** - Raw numbers instead of string tokens:
   ```typescript
   // ❌ Error: Type 'number' is not assignable
   <Box p={4} gap={6} mt={12} />

   // ✅ Fixed: Use string tokens
   <Box p="4" gap="6" mt="12" />
   ```

2. **Hardcoded hex colors**:
   ```typescript
   // ❌ Error: Type '"#8282FB"' is not assignable
   <Box color="#8282FB" />

   // ✅ Fixed: Use semantic tokens
   <Box color="text.highlight" />
   ```

3. **Sizing values**:
   ```typescript
   // ❌ Error: Type '"1200px"' is not assignable
   <Box maxW="1200px" />

   // ✅ Fixed: Use breakpoint tokens
   <Box maxW="breakpoint-2xl" />
   ```

## 🎯 Migration Strategy

### For Each Component/Route

1. **Run TypeScript check**:
   ```bash
   pnpm tsc --noEmit
   ```

2. **Find errors in your file**:
   ```bash
   pnpm tsc --noEmit 2>&1 | grep "your-file.tsx"
   ```

3. **Fix each error type**:

   **Spacing (most common):**
   - Replace `p={4}` → `p="4"`
   - Replace `gap={6}` → `gap="6"`
   - Replace `mt={12}` → `mt="12"`

   **Colors:**
   - Replace hex codes with semantic tokens from the table below
   - If using inline styles with gradients, use `token()` helper:
     ```typescript
     import { token } from '~/styled-system/tokens'

     style={{
       background: `linear-gradient(to-r, ${token('colors.gradient.hero-start')}, ${token('colors.gradient.hero-end')})`
     }}
     ```

   **Sizes:**
   - Replace `"1200px"` → `"breakpoint-2xl"`
   - Replace raw numbers → string tokens
   - Replace `width={180}` → `width="180px"` (with units)

## 🎨 Semantic Token Reference

### Brand Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `brand.primary` | Main brand color - primary buttons, CTAs | #008554 (green) |
| `brand.secondary` | Secondary actions, accents | #DA459C (pink) |
| `brand.accent` | Highlights, decorative elements | #F89A1C (orange) |

### Surface/Background Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `surface.body` | Main body background | #0E0E43 |
| `surface.hero` | Hero section background | #070727 |
| `surface.hero-alt` | Hero gradient end | #0E0E43 |
| `surface.header` | Header background | #070727 |
| `surface.footer` | Footer background | #0E0E43 |
| `surface.card` | Card/panel backgrounds | #1F1F4E |
| `surface.card-alt` | Alternate card background | #151544 |
| `surface.elevated` | Modals, dropdowns | #1F1F4E |

### Text Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `text.primary` | Primary body text | #FCFCFC |
| `text.secondary` | Less important text | #C2C2FF |
| `text.on-brand` | Text on brand colors | #FFFFFF |
| `text.highlight` | Highlighted links/text | #8282FB |
| `text.muted` | Muted/disabled text | #9c9cd7 |

### Border Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `border.default` | Standard borders | #0D0D3F |
| `border.subtle` | Light separation | #8D8DFF33 (20% opacity) |
| `border.emphasis` | Focus/attention borders | #8D8DFF |

### Gradient Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `gradient.hero-start` | Hero gradient start | #070727 |
| `gradient.hero-end` | Hero gradient end | #0E0E43 |
| `gradient.cta-start` | CTA button gradient start | #520030 |
| `gradient.cta-mid` | CTA button gradient middle | #FF52B7 |
| `gradient.cta-end` | CTA button gradient end | #FF8273 |

### Sponsor Tier Colors
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `sponsor.platinum` | Platinum tier | #496F7F |
| `sponsor.gold` | Gold tier | #453927 |
| `sponsor.silver` | Silver tier | #2A3251 |
| `sponsor.bronze` | Bronze tier | #452927 |
| `sponsor.room` | Room sponsor | #1F1F4E |
| `sponsor.digital` | Digital sponsor | #371F4E |
| `sponsor.community` | Community/other | #134343 |

### Interactive States
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `interactive.highlight` | Hover/highlight state | #8282FB |
| `interactive.active` | Active/pressed state | #C2C2FF |
| `interactive.focus` | Focus ring | #8D8DFF |

### Overlay Colors (semi-transparent)
| Token | Purpose | DDD Perth Value |
|-------|---------|-----------------|
| `overlay.subtle` | Subtle overlay | #00BA8D4A (~29% opacity) |
| `overlay.moderate` | Moderate overlay | #FF00E91A (~10% opacity) |
| `overlay.strong` | Strong overlay | #FFFFFF2A (~16% opacity) |

## 🔄 Common Replacements

### Direct Color Mappings
```typescript
// Old hardcoded → New semantic token
"#070727" → "surface.hero" or "surface.header"
"#0E0E43" → "surface.body" or "surface.hero-alt"
"#1F1F4E" → "surface.card"
"#151544" → "surface.card-alt"
"#8282FB" → "text.highlight" or "interactive.highlight"
"#C2C2FF" → "text.secondary"
"#FFFFFF" / "white" → "text.on-brand"
"#8D8DFF33" → "border.subtle"
"#0D0D3F" → "border.default"
```

### Gradients
```typescript
// Hero gradient
gradientFrom="#070727" gradientTo="#0E0E43"
→ gradientFrom="gradient.hero-start" gradientTo="gradient.hero-end"

// CTA button gradient
gradientFrom="#FF52B7" gradientTo="#FF8273"
→ gradientFrom="gradient.cta-mid" gradientTo="gradient.cta-end"
```

## 🚀 For Downstream Forks

Once migration is complete, forking for a new conference is simple:

1. **Create your theme file**: `themes/your-conference.theme.ts`
   ```typescript
   import { defineTheme } from './theme-builder'

   export const yourConferenceTheme = defineTheme({
     colors: {
       brand: {
         primary: { value: '#YOUR_PRIMARY_COLOR' },
         secondary: { value: '#YOUR_SECONDARY_COLOR' },
         // ... rest of colors
       },
       // ... rest of theme
     }
   })
   ```

2. **Update theme config**: `app/theme.config.ts`
   ```typescript
   export { yourConferenceTheme as currentTheme } from '../themes/your-conference.theme'
   ```

3. **Rebuild**: `pnpm build`

**That's it!** No component modifications needed. Zero merge conflicts when pulling upstream updates.

## 📊 Progress Tracking

Run this to see remaining errors:
```bash
pnpm tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

Check specific file:
```bash
pnpm tsc --noEmit 2>&1 | grep "your-file.tsx"
```

## 🛠 Troubleshooting

### "Missing token" warnings from Panda
The warnings about `colors.slate.dark.*` tokens are expected - these come from Park UI's prose typography and can be ignored.

### "Expression produces a union type that is too complex"
This usually happens with Box/Flex components that have many props. Split into smaller components or simplify prop usage.

### Inline styles with gradients
Use the `token()` helper for dynamic color access:
```typescript
import { token } from '~/styled-system/tokens'

style={{ background: `linear-gradient(..., ${token('colors.brand.primary')}, ...)` }}
```

## 📝 Notes

- **Legacy tokens preserved**: The old `2023-*` tokens are still available during migration for backward compatibility
- **Semantic > Descriptive**: Always prefer semantic names (`brand.primary`) over descriptive (`purple`, `blue`)
- **Type safety**: TypeScript will catch any invalid token usage thanks to `strictTokens: true`
- **Documentation**: See `themes/README.md` for detailed theming guide

## ✅ Testing Your Changes

After fixing errors:
1. Run `npx panda codegen` to regenerate CSS
2. Run `pnpm tsc --noEmit` to verify no errors
3. Run `pnpm build` to ensure production build works
4. Visually test the pages you modified

---

**Need help?** Check the files that have already been migrated as examples:
- `app/components/hero/hero-panel.tsx` - Complex gradients
- `app/components/page-components/SponsorSection.tsx` - Dynamic colors with token helper
- `app/recipes/button.ts` - Recipe with semantic tokens
