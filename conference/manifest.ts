/**
 * DDD Perth runtime manifest.
 *
 * Loaded by the app at request time. Strictly avoids Node-only imports so the
 * client bundle doesn't try to inline `path.resolve(...)` calls.
 *
 * Build-time configuration (content directories, theme refs, deployment
 * names) lives in /conference/build-manifest.ts and is read by
 * vite.config.ts / panda.config.ts / scripts.
 *
 * To pull upstream changes from ddd-core: run the /pull-upstream skill.
 * Changes to ConferenceManifest in core will surface as TS errors here.
 */

import type { ConferenceManifest } from '@ddd/conference-config'
import { conferenceConfigPublic } from './config/public'
import { socials } from './config/socials'
import { conferenceConfig } from './config/years-index'

// Year keys this fork knows about. Re-exported so consumers can constrain
// types without depending on the years-index path.
export type ConferenceYears = keyof typeof conferenceConfig.conferences

export const conferenceManifest: ConferenceManifest = {
    public: conferenceConfigPublic,
    socials,
    brand: {
        legalName: 'DDD WA Inc.',
        contactEmail: 'info@dddperth.com',
        sponsorshipEmail: 'sponsorship@dddperth.com',
        noreplyEmail: 'noreply@dddperth.com',
        domain: 'dddperth.com',
        githubOrg: 'dddwa',
    },
    conferences: conferenceConfig,
    homepage: {
        heroBlurbSlug: '_home-hero',
        acknowledgementSlug: '_acknowledgement',
    },
    mobileApp: {
        iosUrl: 'https://apps.apple.com/au/app/ddd-perth/id6670743492',
        androidUrl: 'https://play.google.com/store/apps/details?id=com.dddperth.conference&hl=en_AU',
        iosBundleId: 'au.com.dddperth.app',
        androidBundleId: 'com.dddperth.conference',
    },
}
