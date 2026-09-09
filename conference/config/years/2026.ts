import type { ConferenceYear } from '@ddd/conference-config'
import { DateTime } from 'luxon'

import { optusStadiumVenue } from '../venues/optus-stadium.ts'

export const conference2026: ConferenceYear = {
    kind: 'conference',
    year: '2026',
    venue: optusStadiumVenue,

    sessionizeUrl: 'https://sessionize.com/ddd-perth-2026',

    // New event ID each year — update for 2027.
    sessionizeOrganizerEventId: '24207',

    // Endpoints are injected from env (SESSIONIZE_2026_SESSIONS / SESSIONIZE_2026_ALL_SESSIONS)
    // by getYearConfig. Kept private because the unpublished agenda would otherwise leak.
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: undefined,
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: 131373,
    },

    conferenceDate: DateTime.fromISO('2026-10-03T09:00:00', {
        zone: 'Australia/Perth',
    }),
    agendaPublishedDateTime: DateTime.fromISO('2026-08-24T00:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2026-05-05T17:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2026-06-28T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2026-07-13T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2026-07-26T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$60',
            range: {
                opens: DateTime.fromISO('2026-04-20T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-05-17T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'General',
            price: '$80',
            range: {
                opens: DateTime.fromISO('2026-05-18T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-09-06T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'Final Release',
            price: '$100',
            range: {
                opens: DateTime.fromISO('2026-09-07T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2026-10-02T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
    ],

    feedbackOpenUntilDateTime: undefined,

    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2026',
    },

    sharecast: {
        url: 'https://ddd-2026.sharecast.io/',
        // Keeps add-ons (Coffee Cart Sponsorship, Childcare, Pay it Forward) out of the /share ticket picker
        releaseTitlePrefixes: ['General Attendee'],
    },

    sponsors: {
        platinum: [
            {
                name: 'iCetana',
                website: 'https://www.icetana.ai',
                logoUrlDarkMode: '/images/sponsors/2026-icetana-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-icetana-light.png',
            },
            {
                name: 'Bankwest',
                website: 'https://www.bankwest.com.au/',
                logoUrlDarkMode: '/images/sponsors/2026-bankwest-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-bankwest-light.svg',
            },
        ],
        gold: [
            {
                name: 'Mantel Group',
                website: 'https://mantelgroup.com.au/',
                logoUrlDarkMode: '/images/sponsors/2026-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-mantel-group-light.svg',
            },
            {
                name: 'Microsoft',
                website: 'https://www.microsoft.com/',
                logoUrlDarkMode: '/images/sponsors/2026-microsoft-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-microsoft-light.svg',
            },
            {
                name: 'Qoria',
                website: 'https://qoria.com/',
                logoUrlDarkMode: '/images/sponsors/2026-qoria-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-qoria-light.svg',
            },
            {
                name: 'Woodside',
                website: 'https://www.woodside.com/',
                logoUrlDarkMode: '/images/sponsors/2026-woodside-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-woodside-light.svg',
            },
        ],
        room: [
            {
                name: 'Interfuze',
                website: 'https://interfuze.com/',
                logoUrlDarkMode: '/images/sponsors/2026-interfuze-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-interfuze-light.svg',
                roomName: 'TBC',
            },
        ],
        digital: [
            {
                name: 'Australian Finance Group',
                website: 'https://www.afgonline.com.au/',
                logoUrlDarkMode: '/images/sponsors/2026-afg-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-afg-light.svg',
                quote: 'AFG is on a digital transformation journey, delivering exceptional experiences and market-leading digital products for our customers. We’re proud to once again sponsor DDD Perth and support our home state and the vibrant Perth tech community. Our team will be there on the day, ready to connect, share, and learn.',
            },
            {
                name: 'UWA Data Institute',
                website: 'https://uwadatainstitute.org.au/',
                logoUrlDarkMode: '/images/sponsors/2026-uwa-data-institute-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-uwa-data-institute-light.png',
                quote: 'The UWA Data Institute is proud to support DDD Perth as a Community Sponsor. We’re passionate about strengthening Western Australia’s data, technology and innovation ecosystem, and DDD Perth provides an important platform for the community to connect, share ideas and learn from one another.',
            },
        ],
        community: [
            {
                name: 'Breast Cancer Partners',
                website: 'https://breastcancerpartners.org/',
                logoUrlDarkMode: '/images/sponsors/2026-breast-cancer-partners-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-breast-cancer-partners-light.svg',
            },
            {
                name: 'Hello Initiative',
                website: 'https://www.helloinitiative.org.au/',
                logoUrlDarkMode: '/images/sponsors/2026-hello-initiative-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-hello-initiative-light.png',
            },
            {
                name: 'She Codes',
                website: 'https://shecodes.com.au/',
                logoUrlDarkMode: '/images/sponsors/2026-she-codes-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-she-codes-light.svg',
            },
            {
                name: 'WiTWA',
                website: 'https://www.witwa.org.au/',
                logoUrlDarkMode: '/images/sponsors/2026-witwa-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-witwa-light.svg',
            },
        ],
    },

    foodInfo: {
        lunch: [],
    },
}
