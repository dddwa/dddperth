import { DateTime } from 'luxon'
import type { ConferenceYear } from '~/lib/config-types.server'

import { SESSIONIZE_2025_ALL_SESSIONS, SESSIONIZE_2025_SESSIONS } from '~/lib/config.server'
import { optusStadiumVenue } from '../venues/optus-stadium'

export const conference2025: ConferenceYear = {
    kind: 'conference',
    year: '2025',
    venue: optusStadiumVenue,

    sessionizeUrl: 'https://sessionize.com/ddd-perth-2025',

    sessions: {
        kind: 'sessionize',
        allSessionsEndpoint: SESSIONIZE_2025_ALL_SESSIONS,
        sessionizeEndpoint: SESSIONIZE_2025_SESSIONS,
        underrepresentedGroupsQuestionId: 102438,
    },

    conferenceDate: DateTime.fromISO('2025-09-20T09:00:00', {
        zone: 'Australia/Perth',
    }),
    agendaPublishedDateTime: DateTime.fromISO('2025-08-11T00:00:00', {
        zone: 'Australia/Perth',
    }),
    cfpDates: {
        opens: DateTime.fromISO('2025-05-05T00:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2025-06-15T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    talkVotingDates: {
        opens: DateTime.fromISO('2025-07-01T09:00:00', {
            zone: 'Australia/Perth',
        }),
        closes: DateTime.fromISO('2025-07-20T23:59:59', {
            zone: 'Australia/Perth',
        }),
    },
    ticketReleases: [
        {
            releaseName: 'Early Bird',
            price: '$60',
            range: {
                opens: DateTime.fromISO('2025-03-13T05:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-04-30T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'General',
            // Probably
            price: '$80',
            range: {
                opens: DateTime.fromISO('2025-05-01T00:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-09-12T07:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
        {
            releaseName: 'Final Release',
            // Probably
            price: '$100',
            range: {
                opens: DateTime.fromISO('2025-09-12T08:00:00', {
                    zone: 'Australia/Perth',
                }),
                closes: DateTime.fromISO('2025-09-19T23:59:59', {
                    zone: 'Australia/Perth',
                }),
            },
        },
    ],

    feedbackOpenUntilDateTime: undefined,

    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2025',
    },

    sponsors: {
        platinum: [
            {
                name: 'Patient Zero',
                website: 'https://www.pz.com.au/',
                logoUrlDarkMode: '/images/sponsors/2025-patient-zero-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-patient-zero-light.svg',
                quote: "At first, when we heard that DDD Perth was held in a stadium, we thought there was no way that could be true. Turns out it is. Well done, Perth! Once we learned the truth of the matter, we just had to come and check it out ourselves and share our zombie sock love. Yeah, we love zombies if the name didn't give it away. And we love our zombie sock merch. That, plus, our co-CEO Paul loves to hear himself talk and our other one, Demelza, loves a stage.",
            },
            {
                name: 'MakerX',
                website: 'https://makerx.com.au/',
                logoUrlDarkMode: '/images/sponsors/2025-makerx-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-makerx-light.svg',
                quote: "DDD Perth embodies everything we believe in at MakerX - making technology accessible, fostering diversity, and building high-performing teams. These aren't just ideals we talk about; they're the proven foundation of successful technology companies.The conference itself is a masterclass in bringing people together. With 1,600 passionate technologists gathering in one place, we're witnessing real-time ecosystem building - where today's attendees become tomorrow's co-founders, where nervous first-time speakers evolve into industry leaders, and where casual conversations spark the collaborations that define our tech future. At MakerX, we know that helping our partners succeed requires more than writing code. It's about weaving together culture, connections, and capabilities - transforming research breakthroughs and bold ideas into sustainable businesses that create real impact. That's exactly what DDD Perth facilitates at scale and we're proud to be onboard to support the event for another year.",
            },
        ],
        gold: [
            {
                name: 'Versent',
                website: 'https://versent.com.au/',
                logoUrlDarkMode: '/images/sponsors/2025-versent-dark.png',
                logoUrlLightMode: '/images/sponsors/2025-versent-light.png',
            },
            {
                name: 'SKAO',
                website: 'https://www.skao.int/en',
                logoUrlDarkMode: '/images/sponsors/2025-skao-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-skao-light.svg',
            },
            {
                name: 'Virtual Gaming Worlds',
                website: 'https://www.vgw.co/',
                logoUrlDarkMode: '/images/sponsors/2025-virtual-gaming-worlds-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-virtual-gaming-worlds-light.svg',
                quote: 'At VGW, we believe the future of tech is built on diverse ideas and continuous collaboration. Our partnership with DDD Perth reflects our commitment to supporting a passionate community of developers and innovators who are driving technology forward in Western Australia and beyondâ - Patrick Di Loreto, VGWâs Chief Technology Officer',
            },
            {
                name: 'Qoria',
                website: 'https://qoria.com/',
                logoUrlDarkMode: '/images/sponsors/2025-qoria-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-qoria-light.svg',
                quote: "The Perth technology community has been a key contributor to Qoriaâs growth as a company over the years, and weâre excited to continue to give back to that same community by returning as sponsors in 2025. \nYou won't find a more vibrant, inclusive, and content-rich community tech conference in Australia, and we're so keen to see what is on offer this year.\nCome see our booth on the day to find out how we're making the world safer for students worldwide, and chat about some of the awesome technology that makes that possible.",
            },
            {
                name: 'Octopus Deploy',
                website: 'https://octopus.com/',
                logoUrlDarkMode: '/images/sponsors/2025-octopus-deploy-dark.png',
                logoUrlLightMode: '/images/sponsors/2025-octopus-deploy-light.png',
                quote: "Octopus Deploy has always been about developers helping developers. This is why we're avid supporters of the DDD community across Australia. DDD Perth is a standout event that brings the developer community together to learn, share, and grow, and weâre proud to be part of it. We care deeply about helping teams ship better software, faster, and with less risk. Swing by our booth to chat about joining our team or all things Continuous Delivery, regardless of whether youâre deploying to Kubernetes, the cloud, or hybrid environments.",
            },
            {
                name: 'Microsoft',
                website: 'https://www.microsoft.com/',
                logoUrlDarkMode: '/images/sponsors/2025-microsoft-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-microsoft-light.svg',
            },
            {
                name: 'AWS',
                website: 'https://aws.amazon.com/',
                logoUrlDarkMode: '/images/sponsors/2025-aws-dark.svg',
                logoUrlLightMode: '/images/sponsors/2025-aws-light.svg',
            },
        ],
        room: [],
        community: [],
    },

    foodInfo: {
        lunch: [],
    },
}
