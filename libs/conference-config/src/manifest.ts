/**
 * The ConferenceManifest is the contract between core and a fork.
 *
 * Core (this repo when used standalone, or core/ inside a fork) reads
 * everything fork-specific via this single import path:
 *
 *     import { conferenceManifest } from '@conference/manifest'
 *
 * In standalone core, `@conference/manifest` resolves to /conference-stub/.
 * In a fork repo, the fork's tsconfig overrides the path alias to point at
 * the fork's own /conference/manifest.ts.
 *
 * Adding a required field here is a breaking change for forks — they get a
 * TypeScript error on next `pull-upstream`. Add fields cautiously; prefer
 * making them optional + having a sensible default in core.
 */

import type { ConferenceConfig } from './types'

/**
 * Public, client-safe conference identity. Anything in here may render in
 * HTML, OG meta tags, or be embedded in API responses.
 */
export interface ConferenceConfigPublic {
    /** Display name, e.g. "DDD Perth", "DDD Adelaide" */
    name: string
    /** One-sentence pitch used in meta description, hero subtitle */
    description: string
    /** Longer pitch used on the blog index */
    blogDescription: string
    /** IANA timezone used for all date display (e.g. "Australia/Perth") */
    timezone: string
}

/**
 * Social media accounts. Every field is optional — a conference may not have
 * all of them. The footer derives its links from whatever's present.
 */
export interface Socials {
    Twitter?: { Id: string; Name: string }
    Facebook?: string
    Instagram?: string
    Linkedin?: string
    GitHub?: string
    Youtube?: string
    Flickr?: string
    Blog?: string
    MailingList?: string
    Email?: string
}

/**
 * Brand entity — used for legal copy in the footer, contact emails, and
 * default email From: addresses. These should be stable across conference
 * years (sponsors and dates change; the entity running the conference
 * doesn't).
 */
export interface Brand {
    /** Legal entity, e.g. "DDD WA Inc." */
    legalName: string
    /** General contact email */
    contactEmail: string
    /** Sponsorship enquiries */
    sponsorshipEmail: string
    /** Outbound system mail From: */
    noreplyEmail: string
    /** Primary domain (no scheme), e.g. "dddperth.com" */
    domain: string
    /** GitHub organisation owning the conference's repos */
    githubOrg: string
}

/**
 * Deployment-time identity. Used to generate wrangler configs and to drive
 * Nx D1 migration commands. Per-environment values let the same manifest
 * describe local/staging/production without duplication.
 */
export interface DeploymentConfig {
    /** Cloudflare Worker name. May include an env suffix in staging/prod. */
    workerName: {
        local: string
        staging: string
        production: string
    }
    /** D1 database names. The IDs are env-specific and set in wrangler jsonc. */
    d1DatabaseName: {
        local: string
        staging: string
        production: string
    }
    /** Public URL per environment (no trailing slash) */
    webUrl: {
        local: string
        staging: string
        production: string
    }
}

/**
 * Theme references. Importing themes directly here would couple the
 * manifest type to Panda CSS types; instead the manifest exports getters
 * that return the theme objects. panda.config.ts and the runtime theme
 * boot script both go through this indirection.
 *
 * The shape of `currentTheme` / `currentLightTheme` is whatever
 * `defineTheme(...)` returns — see website/themes/theme-builder.ts.
 */
export interface ThemeRefs<T = unknown> {
    /** Default (dark) theme */
    currentTheme: T
    /** Light theme companion */
    currentLightTheme: T
}

/**
 * Content directories. Paths are absolute and resolved at build time by the
 * fork's manifest.ts (typically with `import.meta.dirname` + path.resolve).
 * Core's mdx-bundles vite plugin reads these to discover MDX files.
 */
export interface ContentPaths {
    /** Absolute path to the folder containing page .mdx files */
    pagesDir: string
    /** Absolute path to the folder containing blog post .md/.mdx files */
    blogDir: string
    /** Absolute path to the blog authors.yml */
    blogAuthorsFile: string
}

/**
 * Optional homepage content slots. Each field names an MDX slug that the
 * fork ships in `conference/content/pages/`. When set, the corresponding
 * core component renders that MDX in place of its built-in copy.
 *
 * The slugs are intentionally optional — a fork can leave them undefined to
 * get core's placeholder/fallback, or set them to opt into fork-owned copy.
 * The components NEVER fall back to DDD Perth-specific text; if a fork
 * doesn't override, they render a neutral placeholder.
 */
export interface HomepageContentSlots {
    /**
     * MDX slug rendered inside the home-page hero panel (multi-paragraph
     * blurb about the conference). Without this, the hero shows a one-line
     * placeholder derived from `conferenceConfigPublic.description`.
     */
    heroBlurbSlug?: string
    /**
     * MDX slug rendered as the Country/land acknowledgement footer.
     * Without this, no acknowledgement section renders. Forks in regions
     * with Country acknowledgement conventions (Australia, Aotearoa, etc.)
     * should set this.
     */
    acknowledgementSlug?: string
}

/**
 * Optional mobile app advertising. When set, /app is reachable and links to
 * the app stores. When absent, /app returns 404 (most forks don't have a
 * mobile app and shouldn't surface a dead route).
 */
export interface MobileApp {
    iosUrl: string
    androidUrl: string
    /** Bundle ID surfaced via /app-config to the mobile app itself. */
    iosBundleId?: string
    androidBundleId?: string
}

/**
 * Runtime manifest — the bits the app needs at request time.
 *
 * Importable from anywhere (server or client) without bundler hazards.
 * The fork's /conference/manifest.ts exports an object of this shape as
 * `conferenceManifest`.
 */
export interface ConferenceManifest {
    public: ConferenceConfigPublic
    socials: Socials
    brand: Brand
    conferences: ConferenceConfig
    /** Fork-supplied homepage content. Optional — sensible fallbacks exist. */
    homepage?: HomepageContentSlots
    /** Mobile app config. Omit for forks without an app — /app returns 404 then. */
    mobileApp?: MobileApp
}

/**
 * Build manifest — extends the runtime manifest with bits that only the
 * build pipeline (vite.config.ts, panda.config.ts, the d1-migrate script)
 * needs. The fork's /conference/build-manifest.ts exports an object of this
 * shape as `conferenceBuildManifest`.
 *
 * Kept separate from `ConferenceManifest` because `content.pagesDir` is
 * computed with `path.resolve(import.meta.dirname, ...)` at the call site,
 * and we don't want that Node-only construct anywhere near the browser
 * bundle.
 */
export interface ConferenceBuildManifest<TTheme = unknown> extends ConferenceManifest {
    deployment: DeploymentConfig
    theme: ThemeRefs<TTheme>
    content: ContentPaths
}
