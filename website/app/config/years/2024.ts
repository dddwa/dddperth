import { DateTime, Settings } from 'luxon'
import { ConferenceYear } from '../../lib/config-types'

Settings.throwOnInvalid = true
declare module 'luxon' {
    interface TSSettings {
        throwOnInvalid: true
    }
}

export const conference2024: ConferenceYear = {
    year: '2024',
    venue: undefined,

    ticketPrice: '$60',
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2024',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/vedvlykn',
    },

    conferenceDate: DateTime.fromISO('2024-11-16'),
    agendaPublishedDateTime: DateTime.fromISO('2024-08-20T17:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2024-06-14T08:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-07-12T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2024-07-23T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-08-06T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    ticketSalesDates: {
        opens: DateTime.fromISO('2024-06-21T08:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2024-11-15T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    feedbackOpenUntilDateTime: DateTime.fromISO('2024-11-21T23:59:59', {
        zone: 'Australia/Perth',
    }),
    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2024',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                website: 'https://www.bankwest.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-bankwest-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-bankwest-light.svg',
                quote: undefined,
            },
            {
                name: 'MakerX',
                website: 'https://makerx.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-makerx-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-makerx-light.svg',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Insight',
                website: 'https://au.insight.com/',
                logoUrlDarkMode: '/images/sponsors/2024-insight-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-insight-light.svg',
                quote: 'Insight is delighted to return as a gold sponsor of DDD Perth and celebrate its 10-year anniversary. DDD Perth is a fantastic event that showcases the diversity and talent of the Perth tech community, and we look forward to the opportunities for learning, sharing and networking',
            },
            {
                name: 'Mantel Group',
                website: 'https://mantelgroup.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-mantel-group-light.svg',
                quote: 'Mantel Group are so proud to once again be sponsoring DDD Perth! Investing in community is central to our mission of changing how the world works for the better, and DDD Perth is an exceptionally awesome event that fosters inclusivity and innovation. Celebrating its 10th anniversary, DDD Perth creates valuable opportunities for underrepresented groups, early career talent, and first-time speakers. We’re excited to have the opportunity to continue our contribution to the growth of the Perth software community.',
            },
            {
                name: 'Qoria',
                website: 'https://qoria.com/',
                logoUrlDarkMode: '/images/sponsors/2024-qoria-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-qoria-light.svg',
                quote: undefined,
            },
            {
                name: 'Telstra / Versent',
                website: 'https://purple.telstra.com/',
                logoUrlDarkMode: '/images/sponsors/2024-telstra-versent-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-telstra-versent-light.svg',
                quote: 'We are excited to announce that Versent & Telstra Purple will be a Gold Sponsor for this year’s DDD Perth conference, celebrating our 10th anniversary! This is a community that’s passionate about innovation, and getting together to share ideas in an open forum. And that’s exactly the sort of culture we like to encourage. We are excited to be back again this year',
            },
            {
                name: 'Tricentis',
                website: 'https://www.tricentis.com/',
                logoUrlDarkMode: '/images/sponsors/2024-tricentis-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-tricentis-light.svg',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                website: 'https://www.vgw.co/',
                logoUrlDarkMode: '/images/sponsors/2024-vgw-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-vgw-light.svg',
                quote: undefined,
            },
            {
                name: 'Woodside Energy',
                website: 'https://www.woodside.com/',
                logoUrlDarkMode: '/images/sponsors/2024-woodside-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-woodside-light.svg',
                quote: "We’re thrilled to announce Woodside's partnership with DDD Perth 2024 as they celebrate their 10th anniversary and Woodside marks 70 years since its establishment. This collaboration demonstrates our dedication to fostering innovation and collaboration within Australia's tech landscape. We are proud to support the local tech community through DDD Perth and engage with diverse minds who are shaping the future of energy and technology.",
            },
            {
                name: 'SKAO',
                website: 'https://www.skao.int/en',
                logoUrlDarkMode: '/images/sponsors/2024-skao-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-skao-light.svg',
                quote: undefined,
            },
            {
                name: 'Datastax',
                website: 'https://www.datastax.com/',
                logoUrlDarkMode: '/images/sponsors/2024-datastax-dark.png',
                logoUrlLightMode: '/images/sponsors/2024-datastax-light.png',
                quote: undefined,
            },
        ],
        room: [
            {
                name: 'Microsoft',
                website: 'https://www.microsoft.com/',
                logoUrlDarkMode: '/images/sponsors/2024-microsoft-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-microsoft-light.svg',
                quote: undefined,
            },
            {
                name: 'SoftwareOne',
                website: 'https://www.softwareone.com/',
                logoUrlDarkMode: '/images/sponsors/2024-softwareone-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-softwareone-light.svg',
                quote: undefined,
            },
        ],
        digital: [
            {
                name: 'AFG',
                website: 'https://www.afgonline.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-afg-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-afg-light.svg',
                quote: undefined,
            },
            {
                name: 'Akkodis',
                website: 'https://akkodis.com/',
                logoUrlDarkMode: '/images/sponsors/2024-akkodis-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-akkodis-light.svg',
                quote: undefined,
            },
            {
                name: 'Interfuze',
                website: 'https://interfuze.com/',
                logoUrlDarkMode: '/images/sponsors/2024-interfuze-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-interfuze-light.svg',
                quote: undefined,
            },
            {
                name: 'WADSIH',
                website: 'https://wadsih.org.au/',
                logoUrlDarkMode: '/images/sponsors/2024-wadsih-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-wadsih-light.svg',
                quote: undefined,
            },
            {
                name: 'UWA Data Institute',
                website: 'https://uwadatainstitute.org.au/',
                logoUrlDarkMode: '/images/sponsors/2024-uwa-di-dark.png',
                logoUrlLightMode: '/images/sponsors/2024-uwa-di-light.png',
                quote: 'The UWA Data Institute is thrilled to be supporting DDD Perth and it’s mission of being the inclusive event for the developer community. At the Data Institute we believe in creating impact from our ground-breaking research and this is only possible in partnership with the thriving WA technology sector. Professor Michael Small (he/him) Director UWA Data Institute | CSIRO-UWA Chair of Complex Systems.',
            },
            {
                name: 'Verse Group',
                website: 'https://www.versegroup.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-verse-group-dark.png',
                logoUrlLightMode: '/images/sponsors/2024-verse-group-light.png',
                quote: "Verse are super excited to be proudly sponsoring the DDD Perth event this year. As a supporter of diversity and inclusion in tech, we are thrilled to be part of this community-driven conference and we look forward to supporting the growth of Perth's vibrant tech community.",
            },
            {
                name: 'DNX Solutions',
                website: 'https://dnx.solutions/',
                logoUrlDarkMode: '/images/sponsors/2024-dnx-solutions-dark.png',
                logoUrlLightMode: '/images/sponsors/2024-dnx-solutions-light.png',
                quote: 'As a sponsor, DNX is committed to supporting the growth and inclusivity of the tech community.',
            },
            {
                name: 'NDC Melbourne',
                website: 'https://ndcmelbourne.com/',
                logoUrlDarkMode: '/images/sponsors/2024-ndc-melbourne-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-ndc-melbourne-light.svg',
                quote: 'NDC Melbourne 2025 is a three-day event for software developers. It includes one day of hands-on workshops, followed by two conference days with multiple tracks. The Early Bird offer ends on 31 December. Secure your tickets now at ndcmelbourne.com.',
            },
            {
                name: 'AWS',
                website: 'https://aws.amazon.com/',
                logoUrlDarkMode: '/images/sponsors/2024-aws-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-aws-light.svg',
                quote: undefined,
            },
        ],
    },
}
