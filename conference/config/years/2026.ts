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

    // The accepted-sessions endpoint is public now the agenda is published.
    // The all-sessions endpoint (every non-declined submission) stays private:
    // it's injected from env (SESSIONIZE_2026_ALL_SESSIONS) by getYearConfig.
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/bmx845x3',
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

    // The conference day and the day after.
    feedbackOpenUntilDateTime: DateTime.fromISO('2026-10-04T23:59:59', {
        zone: 'Australia/Perth',
    }),

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
                website: 'https://bankwest.com.au/',
                logoUrlDarkMode: '/images/sponsors/2026-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-bankwest-light.png',
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
                website: '',
                logoUrlDarkMode: '/images/sponsors/2026-woodside-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-woodside-light.png',
            },
        ],
        room: [
            {
                name: 'Interfuze',
                website: 'https://interfuze.com/',
                logoUrlDarkMode: '/images/sponsors/2026-interfuze-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-interfuze-light.svg',
                roomName: 'River View Room 1',
            },
            {
                name: 'Databricks',
                website: 'https://www.databricks.com/',
                logoUrlDarkMode: '/images/sponsors/2026-databricks-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-databricks-light.svg',
                quote: "The best Data and AI work happens when people share ideas, swap lessons and build on each other's thinking. That's what DDD Perth is all about, and it's why Databricks is proud to sponsor alongside Endava. We're looking forward to the conversations, the connections and the practical ideas that help Perth's developers turn their data into real impact with Data and AI.",
                roomName: 'River View Room 3',
            },
            {
                name: 'Endava',
                website: 'https://www.endava.com/',
                logoUrlDarkMode: '/images/sponsors/2026-endava-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-endava-light.png',
                roomName: 'River View Room 3',
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
            {
                name: 'The Digital Bench',
                website: 'https://www.thedigitalbench.co.uk/',
                logoUrlDarkMode: '/images/sponsors/2026-the-digital-bench-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-the-digital-bench-light.svg',
                quote: 'Delighted to be supporting DDD Perth — bringing so much talent, curiosity and ambition together in one place. Connecting the people shaping the future of tech is what The Digital Bench is all about.',
            },
            {
                name: 'Black Ocean',
                website: 'https://blackocean.io/',
                logoUrlDarkMode: '/images/sponsors/2026-black-ocean-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-black-ocean-light.svg',
                quote: 'I came to DDD Perth in 2024 as an attendee, so sponsoring it with Black Ocean felt like an obvious first step. It’s where Perth’s data and dev people actually meet each other. I’ll be there on the day, so come and find me if you want to talk Fabric, Power BI or where the contract market’s heading.',
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
                name: 'Perth AI',
                website: 'https://perthai.org/',
                logoUrlDarkMode: '/images/sponsors/2026-perth-ai-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-perth-ai-light.png',
            },
            {
                name: 'WA AI Hub',
                website: 'https://wahub.ai/',
                logoUrlDarkMode: '/images/sponsors/2026-wa-ai-hub-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-wa-ai-hub-light.png',
            },
            {
                name: 'WiTWA',
                website: 'https://www.witwa.org.au/',
                logoUrlDarkMode: '/images/sponsors/2026-witwa-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-witwa-light.svg',
            },
        ],
        inKind: [
            {
                name: 'Elite Lighting',
                website: 'https://elitelighting.au/',
                logoUrlDarkMode: '/images/sponsors/2026-elite-lighting-dark.png',
                logoUrlLightMode: '/images/sponsors/2026-elite-lighting-light.png',
            },
            {
                name: 'Spacecubed',
                website: 'https://spacecubed.com/',
                logoUrlDarkMode: '/images/sponsors/2026-spacecubed-dark.svg',
                logoUrlLightMode: '/images/sponsors/2026-spacecubed-light.svg',
            },
        ],
    },

    foodInfo: {
        lunch: [],
    },
}
