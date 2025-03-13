import { DateTime } from 'luxon'
import type { ConferenceYear } from '../../lib/config-types'

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

        generalTicketSlugs: [
            'general-attendee',
            'dqvd7i58iig',
            'general-attendee-company',
            'general-attendee-free',
            'lyfer',
            'volunteer',
            'speaker',
            'sponsor',
        ],
        afterPartyTicketSlugs: ['after-party', 'el5pexoj6m8'],
        afterPartyUpgradeActivityId: '1071952',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                website: 'https://www.bankwest.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-bankwest-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-bankwest-light.svg',
                quote: 'We are excited to partner with DDD as a platinum sponsor at this year’s DDD Perth Conference. As one of Perth’s largest Tech employers in WA with a focused investment in technology and digital services, Bankwest is proud to be a part of Perth’s largest community-run conference which is open to everyone to attend. We look forward to seeing you there and make sure to come and chat to the Bankwest team about career opportunities and hear more about how we are becoming Australia’s favourite digital bank.',
            },
            {
                name: 'MakerX',
                website: 'https://makerx.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-makerx-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-makerx-light.svg',
                quote: "MakerX is thrilled to be a platinum sponsor for the 10-year anniversary of DDD Perth. DDD Perth holds a special place in our hearts as a conference originally founded by two of MakerX's co-founders Matt Davies and Rob Moore, which has since grown beyond our wildest imagination through the hard work of a fantastic diverse team of volunteers. We're thrilled to support and celebrate the enormous progress DDD Perth has made towards inclusively connecting the Perth tech community, supporting all those who can't normally attend or speak at a large tech conference, and look forward to helping attendees learn more about what it takes to build and launch startups of your own!",
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
                quote: "Our staff have always enjoyed attending, speaking or volunteering at DDD Perth, so we're thrilled to return as a gold sponsor for DDD's 10th anniversary. Ten years is a long time in tech - and it's amazing to see how DDD Perth has grown and evolved into the inclusive and highly-engaging conference that it is today.",
            },
            {
                name: 'Telstra | Versent',
                website: 'https://purple.telstra.com/',
                logoUrlDarkMode: '/images/sponsors/2024-telstra-versent-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-telstra-versent-light.svg',
                quote: "We are excited to announce that Versent & Telstra Purple will be a Gold Sponsor for this year's DDD Perth conference, celebrating our 10th anniversary! This is a community that's passionate about innovation, and getting together to share ideas in an open forum. And that's exactly the sort of culture we like to encourage. We are excited to be back again this year",
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
                quote: `At VGW, we are passionate about building a vibrant and inclusive tech community. DDD Perth aligns with our commitment to fostering innovation, and engaging with tech professionals and enthusiasts in our community.

- Yvette Mandanas, Chief People Officer @ VGW
`,
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
                quote: `The SKA Observatory (SKAO) is excited to be supporting the Perth-based software and tech community by being a Gold Sponsor of the upcoming 10th anniversary of hashtag#DDDPerth.

We are building one of the largest scientific instruments of the 21st Century, a radio telescope that will revolutionise our understanding of the Universe and the laws of fundamental physics, right here in Western Australia.

Computing, software and big data will be critical in the success of this mega science project, and we’re recruiting highly motivated developers across the computing and software domains to take part.
`,
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
                quote: `Microsoft is super excited to be a Room Sponsor for the 10th Anniversary of hashtag#DDDPerth. Being able to support the largest hashtag#developer conference in the country year after year has put us right at the heart of a community we love. I still remember standing in a room of 100 developers, which was probably the 2nd year the conference ran and everyone was so proud because they had doubled the numbers from the year before. None of us expected back then that it would continue to double each year until the pandemic, and even then, it hardly stuttered. Whilst Microsoft cannot boast those kind of stats 😉 Our Partnerships with OpenAI, GitHub and Nvidia have enabled us to build a cutting edge, safe and secure environment for developers to build modern AI Apps on Azure. Come say hello to us in our room, we'd love to see you"

- Michelle Sandford from Microsoft`,
                roomName: 'Room 1 - River room',
            },
            {
                name: 'SoftwareOne',
                website: 'https://www.softwareone.com/',
                logoUrlDarkMode: '/images/sponsors/2024-softwareone-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-softwareone-light.svg',
                quote: 'SoftwareONE are delighted to be able to contribute to such the 10th anniversary celebrations for DDD Perth. DDD has such a positive impact on the local technology scene and we would like to congratulate you on such an incredible milestone!',
                roomName: 'Room 3 - River room',
            },
        ],
        digital: [
            {
                name: 'AFG',
                website: 'https://www.afgonline.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-afg-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-afg-light.svg',
                quote: 'AFG is on a digital transformation journey where our tech supports outstanding experiences and market leading digital products for our customers. We are thrilled to sponsor DDD Perth and support our home state and the Perth tech community. AFG architects, software engineers, quality assurance specialists, and product owners will all be there on the day, excited to collaborate and learn from like-minded Perth people',
            },
            {
                name: 'Akkodis',
                website: 'https://akkodis.com/',
                logoUrlDarkMode: '/images/sponsors/2024-akkodis-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-akkodis-light.svg',
                quote: 'Akkodis is excited to be the Digital Sponsor of the 10-year anniversary DDD Perth event, supporting its mission to create an inclusive community for all tech professionals and enthusiasts.',
            },
            {
                name: 'Interfuze',
                website: 'https://interfuze.com/',
                logoUrlDarkMode: '/images/sponsors/2024-interfuze-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-interfuze-light.svg',
                quote: `As a proudly WA-owned IT consultancy, we’re excited to support the 2024 DDD Conference, Perth’s largest community-run tech event. It’s an honour to be involved in celebrating 10 years of connecting and sharing with the local tech community. Sharing knowledge and collaborating with our local tech community is core to our passion for advancing innovation that lives here in WA! A big thank you to the DDD Perth team for creating such a welcoming event for our tech community and congratulations on a decade of incredible work

- Lindsey Duncan, Managing Director of Interfuze Consulting`,
            },
            {
                name: 'WADSIH',
                website: 'https://wadsih.org.au/',
                logoUrlDarkMode: '/images/sponsors/2024-wadsih-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-wadsih-light.svg',
                quote: `The WA Data Science Innovation Hub is proud to support DDD Perth 2024 in its 10th year as it continues to successfully bring together the tech community, building a strong ecosystem of talent in Western Australia

- Alex Jenkins, Director, WADSIH`,
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
        community: [
            {
                name: 'WITWA',
                website: 'https://www.witwa.org.au/',
                logoUrlDarkMode: '/images/sponsors/2024-witwa-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-witwa-light.svg',
            },
            {
                name: 'Bloom',
                website: 'https://bloom.org.au/',
                logoUrlDarkMode: '/images/sponsors/2024-bloom-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-bloom-light.svg',
            },
            {
                name: 'She Codes',
                website: 'https://shecodes.com.au/',
                logoUrlDarkMode: '/images/sponsors/2024-she-codes-dark.svg',
                logoUrlLightMode: '/images/sponsors/2024-she-codes-light.svg',
            },
            {
                name: 'Breast Cancer Partners',
                website: 'https://breastcancerpartners.org/',
                logoUrlDarkMode: '/images/sponsors/2024-breast-cancer-partners-dark-2.svg',
                logoUrlLightMode: '/images/sponsors/2024-breast-cancer-partners-light-2.svg',
            },
        ],
    },

    foodInfo: {
        lunch: [
            {
                meal: 'Vegetable Korma, potato, cauliflower, carrots, peas, steamed basmati rice (V DF, contains coconut milk)',
                shortCode: 'VK',
                foodZone: '1',
            },
            {
                meal: 'Slow cooked beef cheek in red wine sauce with creamy mashed potato (GF)',
                shortCode: 'BR',
                foodZone: '1',
            },
            {
                meal: 'Roast pork belly with pineapple jus, cheesy roast potatoes and mustard spring beans (GF)',
                shortCode: 'PB',
                foodZone: '2',
            },
            {
                meal: 'Classic Caesar salad, cos lettuce, parmesan cheese, egg, bacon, Caesar dressing',
                shortCode: 'CS',
                foodZone: '3',
            },
            {
                meal: 'Cashew butter chicken with basmati rice, yoghurt, and coriander (GF)',
                shortCode: 'BC',
                foodZone: '3',
            },
            {
                meal: 'Beef cheese and bacon burger served with chips',
                shortCode: 'BU',
                foodZone: '4',
            },
            {
                meal: 'Caribbean chicken salad with honey lime dressing (DF)',
                shortCode: 'CC',
                foodZone: '4',
            },
        ],
    },
}
