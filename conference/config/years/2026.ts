import type { ConferenceYear } from '@ddd/conference-config'
import { conferenceTime } from '../dates.ts'

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

    recordings: {
        '1276730': 'Zvlc-l4u5Aw', // When Agents Act, Who Answers?
        '1240238': 'cj9iRf1ky8k', // Authentication for humans, why passkeys finally make sense.
        '1271640': 'KC_kRrg05eQ', // Hacking GitHub Actions
        '1273544': 'IUQTuJPZGHg', // 5 Years in the Trenches: Things I Wish I Knew as a Grad
        '1242790': 'hExxo0snqCU', // To Be Interesting, Be Interested
        '1232680': 'CbRTM6hfr-c', // The Billion Dollar Blindspot: What happens when everyone thinks alike
        '1275205': 'B-2utk8mW-0', // Beyond the Hype: What Quantum Computing Can Teach Us About Responsible Technology Governance
        '1274814': 'EmhhgnHJgFQ', // Psychological Safety in Uncertain Times: Leading When You Don't Have All the Answers
        '1274981': 'oh906LH-Xhw', // Managing your Manager to get Ahead
        '1274977': 'NsnGhMsUf2o', // Newly Acquired Powers of the Web Platform
        '1275363': 'Jf0CZxIs70Y', // Beyond Arrows and Boxes: System Diagrams People Can Actually Understand and Use
        '1275355': 'AAGq578C3Dk', // Rethinking Web: Can we do more with less?
        '1275367': 'Yj_zOIQp6Ns', // Building Software for Humans Who Are Already Busy
        '1274888': '_YZ60ovQ7_A', // The pursuit of spending $0 - building a zero-cost cloud data platform
        '1275071': 'TXhQ1umGekA', // Building Software That Works for People Who Don't Look Like Your Team
        '1274860': 'WLxfg_x9DjE', // The One True Law of Software Engineering
        '1274379': 'H-yI1mi9zMk', // A PM and a Dev Walk Into an Epic
        '1231798': 'UmKQ06peJ1s', // I Didn’t Need to Work Harder — I Needed Better Systems
        '1270736': '3V3epk7a2Nw', // What Women Want: What Every Ally Needs to Hear
        '1269744': 'hhiDSHDGc4A', // Showing is cheap, knowing isn't: What changes when the cost of prototyping collapses?
        '1269920': 'k-bur6_sAPA', // AI-Induced Psychosis at Work: The hidden employee mental health risk organisations are ignoring
        '1275351': 'Y5EbSQn-018', // Growth begins outside your comfort zone
        '1258207': 'DIaVLD5crEs', // No Snakes on My Ladder: Winning at Software with Types
        '1344676': 'kRV0QBO5Coc', // [Sponsor Talk] It Worked on My GPU: Tales from icetana AI Engineering
        '1275236': '7E3d-8gwAPY', // Asynchronous Microservices in Practice
    },

    get conferenceDate() {
        return conferenceTime('2026-10-03T09:00:00')
    },
    get agendaPublishedDateTime() {
        return conferenceTime('2026-08-24T00:00:00')
    },
    cfpDates: {
        get opens() {
            return conferenceTime('2026-05-05T17:00:00')
        },
        get closes() {
            return conferenceTime('2026-06-28T23:59:59')
        },
    },
    talkVotingDates: {
        get opens() {
            return conferenceTime('2026-07-13T00:00:00')
        },
        get closes() {
            return conferenceTime('2026-07-26T23:59:59')
        },
    },
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$60',
            range: {
                get opens() {
                    return conferenceTime('2026-04-20T00:00:00')
                },
                get closes() {
                    return conferenceTime('2026-05-17T23:59:59')
                },
            },
        },
        {
            releaseName: 'General',
            price: '$80',
            range: {
                get opens() {
                    return conferenceTime('2026-05-18T00:00:00')
                },
                get closes() {
                    return conferenceTime('2026-09-06T23:59:59')
                },
            },
        },
        {
            releaseName: 'Final Release',
            price: '$100',
            range: {
                get opens() {
                    return conferenceTime('2026-09-07T00:00:00')
                },
                get closes() {
                    return conferenceTime('2026-10-02T23:59:59')
                },
            },
        },
    ],

    // The conference day and the day after.
    get feedbackOpenUntilDateTime() {
        return conferenceTime('2026-10-04T23:59:59')
    },

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
