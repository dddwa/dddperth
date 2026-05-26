/**
 * DevConf Example runtime manifest.
 *
 * `conference-stub/` is the reference implementation of a fork's
 * `/conference/` folder. It serves two purposes:
 *
 *  1. When ddd-core is built standalone (no fork), the website's tsconfig
 *     resolves `@conference/manifest` to this file so `pnpm build` and
 *     `pnpm start` work out of the box.
 *  2. The `/new-conference` skill copies this folder as the seed for a new
 *     fork's `/conference/` and runs a substitution pass.
 *
 * Keep this representative: DevConf Example has years, sponsors, MDX
 * pages, theme, and wrangler files all wired up. Anyone reading this can
 * see what a fork looks like end-to-end.
 *
 * Mirrors /conference/manifest.ts (DDD Perth's manifest) in shape.
 */

import type { ConferenceManifest } from '@ddd/conference-config'
import { nav } from './config/nav'
import { conferenceConfigPublic } from './config/public'
import { socials } from './config/socials'
import { conferenceConfig } from './config/years-index'

// Year keys this stub knows about. Re-exported so consumers can constrain
// types without depending on the years-index path.
export type ConferenceYears = keyof typeof conferenceConfig.conferences

export const conferenceManifest: ConferenceManifest = {
    public: conferenceConfigPublic,
    socials,
    brand: {
        legalName: 'DevConf Example Inc.',
        contactEmail: 'info@example.test',
        sponsorshipEmail: 'sponsorship@example.test',
        noreplyEmail: 'noreply@example.test',
        domain: 'example.test',
        githubOrg: 'devconf-example',
    },
    conferences: conferenceConfig,
    nav,
    homepage: {
        // Demonstrates the optional MDX-fragment pattern: a fork can supply
        // a hero blurb under content/pages/_home-hero.mdx without writing a
        // full custom homepage. Forks that want a different shape can leave
        // these unset and the hero falls back to `public.description`.
        heroBlurbSlug: '_home-hero',
        // acknowledgementSlug intentionally left undefined — DevConf Example
        // is in a region without a Country acknowledgement convention, so
        // the footer doesn't render the section at all. Compare with DDD
        // Perth's manifest which sets this slug.
    },
    // mobileApp intentionally left undefined — DevConf Example doesn't have
    // a mobile app, so /app returns 404. This shows the opt-in pattern:
    // forks add mobileApp only after publishing to the app stores.
}
