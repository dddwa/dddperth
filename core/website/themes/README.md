# Theming system

This directory holds the **core** theming infrastructure:

- `base.theme.ts` — the semantic token contract every conference theme must implement
- `theme-builder.ts` — turns a theme definition into Panda CSS config

Conference-specific themes live in `/conference/theme/` — not here. They're imported via the `@conference/theme` path alias from `panda.config.ts`. See `ARCHITECTURE.md` at the repo root for how the alias resolution works.

## Adding or changing a theme

Edit the theme files in `/conference/theme/`:

- `<slug>.theme.ts` — the dark theme
- `<slug>-light.theme.ts` — the light theme companion
- `index.ts` — barrel that re-exports both as `currentTheme` and `currentLightTheme`

Both themes must fill in every token group defined in `base.theme.ts`. If you add a new required token to the contract here, every fork's theme will fail to compile until they fill it in — that's intentional. Prefer optional tokens with sensible defaults.

## Token philosophy

All tokens are **purpose-based**, not colour-based. Use `brand.primary` and `text.highlight`, never `purple` or `blue`. That's what lets different conferences ship completely different palettes while sharing every component.

## Token shape

See `base.theme.ts` for the full contract. The major groups:

- `brand` — primary/secondary/accent
- `surface` — body, hero, header, footer, drawer, card, cardAlt, elevated
- `text` — primary, secondary, onBrand, highlight, muted
- `border` — default, subtle, emphasis, sponsor
- `gradient` — heroStart/End, ctaStart/Mid/End
- `sponsor` — platinum, gold, silver, bronze, room, digital, community
- `interactive` — highlight, active, focus
- `overlay` — subtle, moderate, strong, scrim, activeRowStart/End
- `status` — success, warning, danger, info (each with bg/fg/border/emphasis)
- `admin` — 50–900 neutral scale for admin UI chrome

Plus `borders` (token compositions) and `shadows`. See `/conference/theme/perth.theme.ts` or `/conference-stub/theme/example.theme.ts` for fully-filled-out examples.
