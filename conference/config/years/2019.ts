import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'
import agenda2019 from './2019-agenda-data.json' with { type: 'json' }

export const conference2019: ConferenceYear = {
    kind: 'conference',
    year: '2019',
    conferenceDate: DateTime.fromISO('2019-08-03'),
    sessionizeUrl: 'https://sessionize.com/dddperth2019',

    venue: undefined,

    sessions: {
        kind: 'session-data',
        sessions: agenda2019,
    },
    recordings: {
        '112b54cc-df00-40fd-ad5e-4b0714329821': 'rDzlITb-Ro8', // Keynote: AI for Earth: Using machine learning to monitor, model, and manage natural resources
        'ae58057e-2cea-4300-bdb7-f51d57476179': 'PNsLcTBPbY0', // Fun with Sensors and APIs for the web!
        '7bb9859c-ed23-4569-b863-7b4c440b2b88': 'cPHADbOwVsY', // Creative Coding and the JavaScript Canvas
        '9b7efb7a-64e0-41ac-9439-f65a662147da': 'H0KWUtHInMM', // Building Great Teams
        'a6eb8bb3-6086-4cb3-b024-d0a6c4dd3de3': '1ZurB1gCVP8', // Every good outage starts with a queue
        'b2795175-d14d-4090-a62e-153d4534b916': 'pPh5-EducEA', // Quantum Computing 101: A gentle introduction to the world of quantum computing!
        '4c019f6f-c312-4bb9-8024-3352f6034d6e': 'Im-PgWfRyF8', // Locknote: You. Are. Awesome.
        '9c81bbdb-8898-4259-afac-0dc73ff363b5': 'LoiZeuwSo6Q', // 100% Remote Working - Better than you Dared to Dream
        '6d6553c0-b678-434d-b94e-c46fe77c86eb': 'poJt8dZH9qE', // Forget your passwords with the Web Authentication API
        'a577e148-b1d7-42e1-a424-5d0db3107ae2': 'L6S7vPAe5B0', // The Dark Side of Agile: Burnout and You
        '80721e7b-b082-4b50-9a9d-136d3054b7b0': 'c0U5rYGbkj8', // Is it done yet?  (How about now?)
        '385e78cf-b12a-466c-9fb8-e29c7fd627fb': 'D1WSsEfkI0k', // Anyone can Animate, even if they Can’t Draw
        '24ad37da-2c0b-4f5c-afde-3266217e6d80': 'BKZOWcrANMI', // Lost in Space: Risk, Reward and Women-in-Tech
        '2fcea05c-96dc-4802-b8a9-14bcfee01a64': 'sQB_s5rD7gE', // Putting the fast in Fast.Ai - Machine Learning models in 15 mins
        '94a2f4b3-bd6e-4eb6-9917-baa3bcb3d41f': 'Sj9ZAq2D3AU', // How to Raise a Robot Army over #100DaysofCode
        'c044309e-e859-4b5c-adad-7534a36284e0': 'O6EmODTMCRg', // Is VR going to be a “Thing” for UX Design?
        'df03352d-b177-420d-b66a-b1c174e3e0a3': 'gQbXA_HlLPE', // CSS Grid - What is this Magic?!
        '3c2badde-1534-494b-a084-8ca5857d648d': 'VQrydYjFtao', // Cryptography: so much to learn! (If history is anything to go by.)
        '97792db7-0c73-4fee-91c3-00d7fe002540': 'K-TfDaxh1Ac', // Mobile App Development - Crossing the platforms, dotting the notation
        'b73abc43-7634-40d3-a38b-696bdb844cc0': '2BMkRDrvK58', // Dependency Injection is only 1/5 of the Inversion of Control problem
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: undefined,

    sponsors: {
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2019-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2019-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2019-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-bankwest-light.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Hudson',
                logoUrlDarkMode: '/images/sponsors/2019-hudson-dark.svg',
                logoUrlLightMode: '/images/sponsors/2019-hudson-light.svg',
                website: 'https://au.hudson.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2019-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-microsoft-light.png',
                website: 'https://aka.ms/AzureDevDDD19',
                quote: undefined,
            },
            {
                name: 'Modis',
                logoUrlDarkMode: '/images/sponsors/2019-modis-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-modis-light.png',
                website: 'https://www.modis.com/en-au/',
                quote: undefined,
            },
            {
                name: 'Readify + Kloud',
                logoUrlDarkMode: '/images/sponsors/2019-readify-+-kloud-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-readify-+-kloud-light.png',
                website: 'https://readify.net/',
                quote: undefined,
            },
            {
                name: 'Velrada',
                logoUrlDarkMode: '/images/sponsors/2019-velrada-dark.png',
                logoUrlLightMode: '/images/sponsors/2019-velrada-light.png',
                website: 'https://velrada.com/',
                quote: undefined,
            },
        ],
    },
}
