// DevConf Example 2025 — fully-detailed reference year.
//
// Set in October 2025 (a real-ish past date so the importance-of-dates
// machinery in core gets a chance to compute "after the conference"
// states correctly). Sessionize endpoints are undefined so core falls
// back to "no agenda yet" rendering; if you want to demo the agenda
// page locally, swap `sessions` to `kind: 'session-data'` with a static
// JSON dump.

import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'
import { exampleConventionCentre } from '../venues/example-convention-centre'

export const conference2025: ConferenceYear = {
    kind: 'conference',
    year: '2025',
    venue: exampleConventionCentre,

    sessionizeUrl: 'https://sessionize.com/devconf-example-2025',

    // Stub doesn't hit the real Sessionize API. Forks fill these in with
    // their actual endpoint IDs.
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: undefined,
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },

    conferenceDate: DateTime.fromISO('2025-10-18T09:00:00', { zone: 'Etc/UTC' }),
    agendaPublishedDateTime: DateTime.fromISO('2025-09-15T00:00:00', { zone: 'Etc/UTC' }),
    cfpDates: {
        opens: DateTime.fromISO('2025-06-01T00:00:00', { zone: 'Etc/UTC' }),
        closes: DateTime.fromISO('2025-07-15T23:59:59', { zone: 'Etc/UTC' }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2025-08-01T00:00:00', { zone: 'Etc/UTC' }),
        closes: DateTime.fromISO('2025-08-20T23:59:59', { zone: 'Etc/UTC' }),
    },
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$50',
            range: {
                opens: DateTime.fromISO('2025-04-01T00:00:00', { zone: 'Etc/UTC' }),
                closes: DateTime.fromISO('2025-06-30T23:59:59', { zone: 'Etc/UTC' }),
            },
        },
        {
            releaseName: 'General',
            price: '$80',
            range: {
                opens: DateTime.fromISO('2025-07-01T00:00:00', { zone: 'Etc/UTC' }),
                closes: DateTime.fromISO('2025-10-10T23:59:59', { zone: 'Etc/UTC' }),
            },
        },
        {
            releaseName: 'Last Minute',
            price: '$120',
            range: {
                opens: DateTime.fromISO('2025-10-11T00:00:00', { zone: 'Etc/UTC' }),
                closes: DateTime.fromISO('2025-10-17T23:59:59', { zone: 'Etc/UTC' }),
            },
        },
    ],

    feedbackOpenUntilDateTime: DateTime.fromISO('2025-10-25T23:59:59', { zone: 'Etc/UTC' }),

    // Placeholder Tito account — won't resolve, but exercises the
    // ticket-info shape so forks can see the wiring.
    ticketInfo: {
        type: 'tito',
        accountId: 'devconf-example',
        eventId: '2025',
    },

    sponsors: {
        platinum: [
            {
                name: 'DDD Perth',
                website: 'https://dddperth.com/',
                logoUrlDarkMode: '/images/sponsors/devconf-ddd-perth-dark.png',
                logoUrlLightMode: '/images/sponsors/devconf-ddd-perth-light.png',
                quote: 'DDD Perth is a real conference appearing here as the meta sample sponsor for DevConf Example. We run an inclusive non-profit conference for the Perth software community — see dddperth.com for the real thing.',
            },
        ],
        gold: [
            {
                name: 'Acme Corp',
                website: 'https://example.test/acme',
                logoUrlDarkMode: '/images/sponsors/devconf-acme-dark.svg',
                logoUrlLightMode: '/images/sponsors/devconf-acme-light.svg',
                quote: 'Acme Corp is a fictional company that exists solely to populate sample sponsor tiers. We make absolutely nothing, and yet somehow our market cap rivals real companies. The wonder of stub data.',
            },
            {
                name: 'Globex',
                website: 'https://example.test/globex',
                logoUrlDarkMode: '/images/sponsors/devconf-globex-dark.svg',
                logoUrlLightMode: '/images/sponsors/devconf-globex-light.svg',
            },
        ],
        digital: [
            {
                name: 'Initech',
                website: 'https://example.test/initech',
                logoUrlDarkMode: '/images/sponsors/devconf-initech-dark.svg',
                logoUrlLightMode: '/images/sponsors/devconf-initech-light.svg',
                quote: 'Initech is excited to sponsor DevConf Example for the second year running. We believe deeply in the importance of TPS reports, and DevConf is where the best TPS reports happen.',
            },
        ],
        community: [
            {
                name: 'Acme Corp',
                website: 'https://example.test/acme',
                logoUrlDarkMode: '/images/sponsors/devconf-acme-dark.svg',
                logoUrlLightMode: '/images/sponsors/devconf-acme-light.svg',
            },
        ],
    },

    foodInfo: {
        lunch: [
            {
                meal: 'Grain bowl with roasted vegetables and tahini (V, GF)',
                shortCode: 'GB',
                foodZone: '1',
            },
            {
                meal: 'Spiced chicken with rice pilaf and yoghurt (GF)',
                shortCode: 'SC',
                foodZone: '1',
            },
            {
                meal: 'Mushroom risotto with shaved parmesan (V)',
                shortCode: 'MR',
                foodZone: '2',
            },
        ],
    },
}
