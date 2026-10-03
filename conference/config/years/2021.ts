import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'

export const conference2021: ConferenceYear = {
    kind: 'conference',
    year: '2021',
    conferenceDate: DateTime.fromISO('2021-08-14'),
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2021',

    venue: undefined,

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/tj9fupmc',
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },
    recordings: {
        '271165': 'jlpLSN9A_X4', // Return code < human error >
        '261412': '0bGEP6WWXQQ', // Unleash Your Inner CTO!
        '261106': 'ZVaOQRWxqMA', // Stringly-Typed to Strongly-Typed with TypeScript
        '259766': 'QjRFO3AMrUg', // Product Ownership - what is it?
        '260665': 'jALETmi-mQY', // The Computer Science Behind Colour
        '261278': 'ETJUi_aempM', // What can Indigenous thinking teach us about building sophisticated ethical technology?
        '261107': '0ofzzga9MCg', // Show Your Work - Using Data Science to Peek inside the Black Box
        '261410': 'W3kJx_dsXm8', // The Billion Event Challenge
        '261125': '6tB2QAoVZPg', // Practical Performance
        '256294': 'NOhVrVM1hEw', // Building a 6 million request per second web server
        '256312': 'veQmRS_d15c', // Lets build a CarPlay app
        '259762': 'dO3_C4uq_H8', // How to design tutorials your users won't ignore
        '261414': 'mYnfRsyaug4', // ASX Trading vs. Machine Learning – ML Ops by accident
        '259036': '-pQAUKmN0-w', // Everything is a Feature Toggle
        '261431': '-qx6uDyA-8I', // Stop writing tests
        '261365': 'jPVDOcqQAag', // Animation - a Whole Lottie Tools out There
        '260914': 'PmQggXsPi4A', // Embedding Cybersecurity into your Business Culture
        '261169': 'AGf1wXDUfTc', // Bye bye YAML, painless Kubernetes deployments with CDK8s
        '261426': 'EFVeS4HyecA', // (Un)Anticipated Consequences: Rethinking artificial intelligence and automated systems
        '270646': '66amcwsJa2I', // Your Unique Journey
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: undefined,

    sponsors: {
        platinum: [
            {
                name: 'Valrose',
                logoUrlDarkMode: '/images/sponsors/2021-valrose-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-valrose-light.png',
                website: 'https://valrose.com.au/',
                quote: undefined,
            },
            {
                name: 'Telstra Purple',
                logoUrlDarkMode: '/images/sponsors/2021-telstra-purple-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-telstra-purple-light.png',
                website: 'https://purple.telstra.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Octopus Deploy',
                logoUrlDarkMode: '/images/sponsors/2021-octopus-deploy-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-octopus-deploy-light.png',
                website: 'https://octopus.com/',
                quote: undefined,
            },
            {
                name: 'VIX',
                logoUrlDarkMode: '/images/sponsors/2021-vix-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-vix-light.png',
                website: 'https://www.vixtechnology.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2021-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Imdex',
                logoUrlDarkMode: '/images/sponsors/2021-imdex-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-imdex-light.png',
                website: 'https://www.imdexlimited.com/',
                quote: undefined,
            },
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2021-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2021-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2021-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2021-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2021-microsoft-light.png',
                website: 'https://www.microsoft.com/en-au/',
                quote: undefined,
            },
        ],
    },
}
