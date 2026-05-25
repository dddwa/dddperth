// Example Convention Centre — fictional venue for DevConf Example.
// Address is a real geocodable San Francisco location (Moscone Center)
// so the embedded map widget renders against a real tile if a fork tries
// to demo the venue page before swapping in their own.

import type { ConferenceVenue } from '@ddd/conference-config'

export const exampleConventionCentre: ConferenceVenue = {
    name: 'Example Convention Centre',
    address: {
        streetAddress: '747 Howard St',
        addressLocality: 'San Francisco',
        addressRegion: 'CA',
        postalCode: '94103',
        addressCountry: 'US',
    },
    latitude: 37.784172,
    longitude: -122.401558,
}
