import { defineConfig, defineRecipe } from '@pandacss/dev'
import typographyPreset from 'pandacss-preset-typography'
import { indigo } from './app/theme/colors/indigo'
import { slate } from './app/theme/colors/slate'
import { keyframes as parkKeyframes } from './app/theme/keyframes'
import { layerStyles } from './app/theme/layer-styles'
import { recipes as parkRecipes, slotRecipes as parkSlotRecipes } from './app/theme/recipes'
import { textStyles } from './app/theme/text-styles'
import { colors as parkBaseColors } from './app/theme/tokens/colors'
import { durations } from './app/theme/tokens/durations'
import { shadows as parkShadows } from './app/theme/tokens/shadows'
import { zIndex as parkZIndex } from './app/theme/tokens/z-index'
// Theme barrel deliberately picked over build-manifest: panda bundles
// panda.config.ts as CJS, which breaks build-manifest's `import.meta.dirname`.
// @conference/theme has no Node-only imports.
import { currentLightTheme, currentTheme } from '@conference/theme'
import { createSemanticTokens, createThemeColorSemanticTokens, createThemeTokens } from './themes/theme-builder'

const navLinkRecipe = defineRecipe({
    className: 'navLink',
    // Tell Panda which JSX components consume this recipe so it can extract the
    // variant/size/active props at build time. Without this, the static
    // analyser only sees the runtime `navLink({...})` call inside AppLink with
    // unresolved variable arguments, so it emits CSS only for the default
    // `primary`/`md`/`false` variants — meaning <AppLink variant="chrome"> ends
    // up rendering with no matching .navLink--variant_chrome rule in the bundle.
    jsx: ['AppLink', 'AppNavLink'],
    base: {
        display: 'flex',
        alignItems: 'center',
        fontFamily: 'body',
        fontWeight: 'medium',
        textDecoration: 'none',
        transition: 'colors',
        _focus: {
            outline: 'focus-chrome',
            outlineOffset: '0.5',
        },
    },
    variants: {
        variant: {
            primary: {
                color: 'text.on-brand',
                // Hover tint sits on top of `surface.footer` (dark brand surface in
                // both themes). `text.highlight` is body-content highlight (purple
                // in dark, indigo in light) and fights the dark green footer strip.
                // `brand.accent` (orange/coral) lands clearly on both dark surfaces
                // and reads as a brand-coherent hover. Used for footer + dark-mode
                // header. Light-mode header uses `chrome` instead (see below).
                _hover: { color: 'brand.accent' },
                _active: { color: 'brand.accent' },
            },
            onDark: {
                // Overlay/drawer links sit on a near-black surface (surface.drawer)
                // in BOTH themes, so their text must stay light regardless of theme.
                // `text.on-brand` can't be reused: it's white in the light theme but
                // dark (#0f172a) in the dark theme, where it's tuned for text on the
                // bright teal CTA gradient — dark-on-near-black in the drawer is
                // unreadable. Fixed white base + brand.accent hover matches the
                // light-theme drawer, so the menu looks the same in both themes.
                color: 'white',
                _hover: { color: 'brand.accent' },
                _active: { color: 'brand.accent' },
            },
            chrome: {
                // Header in light theme blends into the off-white body, so nav text
                // can't be locked to white. `text.primary` adapts: cream-white on dark
                // body, dark indigo on light body. Hover uses `text.highlight` (purple
                // in dark, vivid indigo in light) for a body-content-style link feel.
                color: 'text.primary',
                _hover: { color: 'text.highlight' },
                _active: { color: 'text.highlight' },
            },
            admin: {
                px: '4',
                py: '2',
                borderRadius: 'md',
                border: 'transparent',
                _hover: {
                    bg: 'overlay.subtle',
                    borderColor: 'border.subtle',
                },
            },
            portalTab: {
                // Tabs in the portal shell, which sits on `surface.drawer` (brand-dark
                // in both themes) — so fixed white text, never a theme-varying token.
                // Active state keys off NavLink's aria-current rather than the
                // `active` prop, so a tab can't be marked current by hand and drift.
                color: 'white.a10',
                fontSize: 'sm',
                whiteSpace: 'nowrap',
                px: '1',
                py: '3',
                borderBottom: 'tab-indicator',
                _hover: { color: 'white', borderBottomColor: 'white.a6' },
                _currentPage: { color: 'white', borderBottomColor: 'brand.accent' },
                _focus: { outline: 'focus-on-dark', outlineOffset: '0.5' },
            },
            ghost: {
                color: 'gray.7',
                _hover: { color: 'gray.9' },
                _active: { color: 'gray.9' },
            },
            accent: {
                color: 'indigo.7',
                _hover: { color: 'indigo.8' },
                _active: { color: 'indigo.8' },
            },
        },
        size: {
            sm: { fontSize: 'sm', gap: '2' },
            md: { fontSize: 'md', gap: '2' },
            lg: { fontSize: 'lg', gap: '3' },
        },
        active: {
            true: {},
            false: {},
        },
    },
    compoundVariants: [
        {
            variant: 'admin',
            active: true,
            css: {
                color: 'interactive.active',
                bg: 'overlay.moderate',
                borderColor: 'border.subtle',
            },
        },
        {
            variant: 'admin',
            active: false,
            css: { color: 'text.on-brand' },
        },
    ],
    defaultVariants: {
        variant: 'primary',
        size: 'md',
        active: false,
    },
})

const themeTokens = createThemeTokens(currentTheme)
const themeColorSemanticTokens = createThemeColorSemanticTokens(currentTheme, currentLightTheme)

export default defineConfig({
    // Whether to use css reset
    preflight: true,

    // Where to look for your css declarations
    include: ['./app/routes/**/*.{ts,tsx,js,jsx}', './app/components/**/*.{ts,tsx,js,jsx}'],
    // preset-panda extends preset-base with the full default token scales
    // (radii, spacing, sizes, fontSizes, fontWeights, lineHeights, fonts,
    // easings, blurs, animations). Park UI 0.43.1 used to provide these via
    // its `createPreset(...)` call; switching to preset-panda preserves the
    // values within sub-rem precision so nothing visual shifts. Park UI 1.0's
    // theme files (under app/theme/*) layer color + radius semantic tokens
    // on top, plus the spinner-specific `spin` animation reintroduced below.
    presets: [typographyPreset(), '@pandacss/preset-panda'],

    jsxFramework: 'react',

    // Files to exclude
    exclude: [],

    // Enable strict tokens mode - forces usage of design tokens instead of arbitrary values
    strictTokens: true,

    // Percentage offsets for absolute positioning (centring, a dropdown below
    // its trigger), which the spacing scale they otherwise draw from lacks.
    utilities: {
        extend: Object.fromEntries(
            ['top', 'right', 'bottom', 'left', 'insetInlineStart', 'insetInlineEnd'].map((property) => [
                property,
                { values: (theme: (path: string) => object) => ({ ...theme('spacing'), half: '50%', full: '100%' }) },
            ]),
        ),
    },

    // Default colorPalette so Park UI recipes (button, spinner) can resolve
    // `colorPalette.solid.bg`, `colorPalette.surface.border`, etc., without
    // every consumer having to set it explicitly. `gray` aliases to slate in
    // the semantic-token table below.
    globalCss: {
        html: {
            colorPalette: 'gray',
        },
    },

    // Light/dark theme switching: Panda emits semantic-token `_light` values
    // under `:where(.light, .light *)` and `_dark` values under `:where(.dark, .dark *)`.
    // The toggle component sets the matching class on <html> at runtime. The boot
    // script in root.tsx ensures the class is present before first paint, so the
    // default Panda conditions (no preset-driven `:root` override) work cleanly here.

    // Useful for theme customization
    theme: {
        // navLink is project-specific; the Park-UI-derived button + spinner recipes
        // are merged in under `extend.recipes` below so they layer with any other
        // local additions through the normal Panda extend semantics.
        recipes: {
            navLink: navLinkRecipe,
        },
        breakpoints: {
            xxs: '340px',
            xs: '400px',
            sm: '640px',
            md: '768px',
            lg: '1024px',
            xl: '1280px',
            '1.5xl': '1440px',
            '2xl': '1536px',
            '3xl': '1792px',
            '4xl': '1920px',
            '5xl': '2100px',
            '6xl': '2560px',
        },
        extend: {
            // Park UI 1.0 recipes (button, spinner). Park UI moved away from the
            // npm preset in v1.0 — recipes are copied into the project under
            // app/theme/recipes/ and registered here. See app/theme/recipes/index.ts.
            recipes: parkRecipes,
            slotRecipes: parkSlotRecipes,

            // Build-time visual primitives the Park UI recipes reference:
            // layerStyle('disabled') for greyed-out buttons, textStyles for line-
            // height ladders, animationStyles for motion presets. Keyframes are
            // merged with the local `rotateText` keyframe further below.
            layerStyles,
            textStyles,
            semanticTokens: {
                // Border-radius scale Park UI recipes consume via `borderRadius: 'l2'`.
                // Sourced from the `sm` preset (default Park UI radius scale) — the
                // l1/l2/l3 indirection lets us re-tune all UI corner radii in one
                // place by repointing these aliases at a different radii step.
                radii: {
                    l1: { value: '{radii.xs}' },
                    l2: { value: '{radii.sm}' },
                    l3: { value: '{radii.md}' },
                },
                // Park UI 1.0 base shadows referencing slate/black alpha steps.
                // Layered under our own shadow tokens (themeTokens.shadows) which
                // win via the extend ordering — these provide xs/sm/md/lg/xl/2xl
                // defaults for any Park UI recipe that doesn't have a custom shadow.
                shadows: parkShadows,
                colors: {
                    // Park UI 1.0 ships its colors as semantic tokens (12-step
                    // light/dark scales with alpha + colorPalette sub-tokens like
                    // `solid.bg`, `surface.bg`, etc). Indigo stays as `indigo.*`;
                    // slate is aliased to `gray.*` so the existing local references
                    // to gray.7/gray.9/indigo.7/indigo.8 in this file (navLink) and
                    // the Park UI button recipe (`colorPalette.solid.bg`, etc.) all
                    // resolve. `html { colorPalette: 'gray' }` in app/index.css
                    // routes unqualified `colorPalette.*` through slate.
                    indigo,
                    gray: slate,

                    // Conference theme color tokens - emit dark + light values per token
                    // and swap based on the configured `_dark` condition.
                    ...themeColorSemanticTokens,

                    // Convenience aliases (bg.body, button.primary.bg, etc) - inherit the
                    // dark/light swap automatically through token references.
                    ...createSemanticTokens(currentTheme).colors,

                    // Typography semantic tokens (prose) - mapped to theme text tokens
                    prose: {
                        body: { value: '{colors.text.primary}' },
                        heading: { value: '{colors.text.primary}' },
                        lead: { value: '{colors.text.secondary}' },
                        link: { value: '{colors.text.highlight}' },
                        bold: { value: '{colors.text.primary}' },
                        counter: { value: '{colors.text.muted}' },
                        bullet: { value: '{colors.text.secondary}' },
                        hrBorder: { value: '{colors.border.subtle}' },
                        quote: { value: '{colors.text.primary}' },
                        quoteBorder: { value: '{colors.border.emphasis}' },
                        caption: { value: '{colors.text.muted}' },
                        kbd: { value: '{colors.text.primary}' },
                        kbdShadow: { value: '0 0 0' },
                        code: { value: '{colors.text.primary}' },
                        preCode: { value: '{colors.text.secondary}' },
                        preBg: { value: '{colors.surface.card}' },
                        thBorder: { value: '{colors.border.emphasis}' },
                        tdBorder: { value: '{colors.border.subtle}' },
                    },
                },
            },
            tokens: {
                // Park UI base raw tokens — black/white scales + the duration scale
                // used by `durations: 'slowest'`. The local themeTokens layer on top.
                colors: {
                    ...parkBaseColors,
                    // Sponsor tier badges in the portal header. Fixed rather than
                    // themed: a tier's colour identifies it, so it shouldn't change
                    // with the conference palette or the light/dark toggle.
                    tier: {
                        platinum: { bg: { value: '#e2e8f0' }, fg: { value: '#1e293b' } },
                        gold: { bg: { value: '#f6d77b' }, fg: { value: '#4a3500' } },
                        silver: { bg: { value: '#cbd5e1' }, fg: { value: '#1e293b' } },
                        bronze: { bg: { value: '#e9b48a' }, fg: { value: '#4a2208' } },
                    },
                },
                durations,
                zIndex: {
                    ...parkZIndex,
                    '9999': { value: 9999 },
                    // One step above its siblings, for local stacking inside a
                    // component; `docked` (10) and up are for page-level layers.
                    raised: { value: 1 },
                },

                // Non-color theme tokens (borders, shadows) - reference colour tokens
                // via {colors.x} so they pick up the dark/light swap at runtime.
                ...themeTokens,

                borders: {
                    ...themeTokens.borders,
                    sponsor: { value: '6px solid {colors.border.sponsor}' },
                    // Focus outlines. Each references a colour token, so a fork's
                    // theme recolours them; a bracketed `[3px solid #…]` would not.
                    focus: { value: '3px solid {colors.interactive.focus}' },
                    'focus-chrome': { value: '2px solid {colors.indigo.7}' },
                    'focus-admin': { value: '2px solid {colors.admin.900}' },
                    // On `surface.drawer`, which is brand-dark in both themes.
                    'focus-on-dark': { value: '2px solid {colors.white}' },
                    // Reserves the space of a border that only gets a colour on
                    // hover or when active, so the layout doesn't shift.
                    transparent: { value: '1px solid transparent' },
                    'tab-indicator': { value: '3px solid transparent' },
                },
                shadows: {
                    ...themeTokens.shadows,
                    'admin-card': {
                        value: '0 1px 2px rgba(16, 24, 40, 0.05), 0 1px 3px rgba(16, 24, 40, 0.08)',
                    },
                    // Left accent bar on the runsheet's current session.
                    'current-row': { value: 'inset 6px 0 0 {colors.status.success.emphasis}' },
                },
                fonts: {
                    display: { value: 'Ubuntu, sans-serif' },
                    body: { value: 'Ubuntu, sans-serif' },
                },
                // `animation: 'spin'` resolves through Panda's animation utility,
                // which reads the `animations` token group. Park UI 0.43 shipped
                // this in the npm preset; 1.0 leaves it to the project, so we
                // declare it locally to keep the spinner recipe working.
                animations: {
                    spin: { value: 'spin 1s linear infinite' },
                },
                // `dvh` rather than preset-panda's `screen` (100vh): on mobile
                // `vh` includes the area behind the browser toolbar, so a
                // full-screen panel sized with it hides its own bottom edge.
                sizes: {
                    dvh: { value: '100dvh' },
                    'dialog-max-h': { value: '85vh' },
                    'page-max-w': { value: '1200px' },
                    // Steps on preset-panda's 4px scale (key = px / 4) that it
                    // doesn't ship. Public pages were laid out at these widths
                    // before they became tokens; rounding them to the nearest
                    // preset step moved the home, sponsors and agenda baselines.
                    '22.5': { value: '5.625rem' },
                    '25': { value: '6.25rem' },
                    '27.5': { value: '6.875rem' },
                    '30': { value: '7.5rem' },
                    '35': { value: '8.75rem' },
                    '37.5': { value: '9.375rem' },
                    '45': { value: '11.25rem' },
                    '50': { value: '12.5rem' },
                    '55': { value: '13.75rem' },
                    '65': { value: '16.25rem' },
                    '100': { value: '25rem' },
                    '105': { value: '26.25rem' },
                    '180': { value: '45rem' },
                    '200': { value: '50rem' },
                    // Hairlines; the numeric scale starts at 0.5 (2px).
                    px: { value: '1px' },
                },
                radii: {
                    none: { value: '0' },
                },
            },
            // Local `rotateText` keyframe merged with the Park UI animation set
            // (slide/scale/expand/collapse). The `spin` keyframe was previously
            // provided by @park-ui/panda-preset and is re-declared here for the
            // spinner recipe's `animation: 'spin'` to resolve.
            keyframes: {
                ...parkKeyframes,
                spin: {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                },
                rotateText: {
                    '0%': {
                        transform: 'rotate(0deg)',
                    },
                    '100%': {
                        transform: 'rotate(-360deg)',
                    },
                },
            },
        },
    },

    // The output directory for your css system
    outdir: 'app/styled-system',
})
