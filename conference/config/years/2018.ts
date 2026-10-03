import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'
import agenda2018 from './2018-agenda-data.json' with { type: 'json' }

export const conference2018: ConferenceYear = {
    kind: 'conference',
    year: '2018',
    conferenceDate: DateTime.fromISO('2018-08-04'),
    sessionizeUrl: 'https://sessionize.com/dddperth2018',

    venue: undefined,

    sessions: {
        kind: 'session-data',
        sessions: agenda2018,
    },
    recordings: {
        'c79f149d-4e7b-4202-ba30-13cbb1df1b33': 'MDrrZucJtJo', // Keynote: Towards a welcoming Web
        '24bc1c06-ec0d-4ba0-8d3e-a995d2118f46': 'Zgq3guIeCac', // Thinking in Streams - gentle introduction to reactive programming via RxJS
        '6cf90233-65d8-4bdd-868f-9d13683aac78': 'gowvZ_EgZ3c', // You're doing TypeScript wrong
        '5588dee1-39a1-47a9-bc04-376ff1578930': 'okw6yzukTEY', // Sketching & how to win at Pictionary
        '26c62196-0d96-4e52-b4ba-7896ddf2ff04': 'NCj0xNu8f8s', // Lunchnote: The Structure of Software Revolutions
        '3a0236e4-c8fa-4cc9-ab48-fc0371a6b990': '01A780iuLTI', // Serverless Cloud Native Progressive Web Apps in Production : Lesson from the Trenches
        'f7fc010d-8c47-4b86-b1e9-1221b63e0281': 'BKyEHYN1Ob4', // Understand Functional Programming in 40 Minutes (or your Money Back*)
        '264b7669-8127-41a3-9f6b-87511a879cf1': 'Vb8ebpzoioQ', // Locknote: Better mental health in the workplace
        '318d8f95-54e8-486b-8119-94bb91924f64': 'cUPtZY_zF6c', // Looking for a pet project? Here is a list of humanity's biggest challenges.
        '0f383402-2fee-4728-a6bf-fbe74ba2671e': 'lRYwBQNIi7Y', // Building Highly Engaged Teams
        '96326393-7372-46d0-a07c-3006b97517cf': 'QiqCxMGBssU', // Toxic Developers and You
        'dd4a2717-47ed-426f-a97d-5bb4f9c1fef3': '4XVNZUpAMUw', // Creating a ‘best place to work’ culture
        '2234f8f6-6e13-4998-ba37-baf53ae44d9d': 'e_ATZWVWJzU', // Rise of the Tech Influencer - Small steps you can take to increase your reach
        'ab660bb2-d12a-4627-9c2a-b92900e87bca': 'M3b1WniuUec', // Service Meshes - Powering the next wave of microservice architectures
        '0d35dfb9-c75f-48a4-bd73-18fe07f6a04b': '45sMGmb5iyA', // Blockchain: More than cryptocurrency!
        'ee60b006-8662-4d8c-8a60-4ee4ad2018f7': '64W8d8d3lrs', // How to win friends and comply with the Notifiable Data Breaches scheme*
        'a9c48983-c3c9-4ceb-b21b-6b1d116a6882': 'JmWLYpofw3g', // MicroServices UI Composition
        '9ac2e311-7559-436c-8ee8-6f0aed17a431': '04Vb9pAmnBk', // 10 UX principles you should know about
        '4f463f9b-bf28-446a-9558-c6ac59697cc9': '3VlN37keE5c', // Functional HTML
        '77fea600-238f-4523-baf8-f51b5db5d666': '3GAsQoe5Mvs', // Reverse Engineering is Good and also For Everyone
        '88344a80-a3e8-484a-93b6-e6a4f80af84f': 'EqniemG4ME0', // What to do with our unconscious bias.
        'a45d6be4-668d-4c01-8522-34c43580baab': 'klBLyVR56I8', // Machine Learning to Diagnose Childhood Brain Tumours
        'c0f29a8d-0c21-43d6-aeb1-c34054e6541f': 'nla84hCtE5Q', // Delightful Frontend Development: An Intro to Elm
        'fd830fb5-8e7b-4527-bc79-f7ddf693232f': 'PuCZpvY9VnI', // Advanced Testing Techniques: Tips from the trenches
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
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2018-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Amazon Web Services',
                logoUrlDarkMode: '/images/sponsors/2018-amazon-web-services-dark.svg',
                logoUrlLightMode: '/images/sponsors/2018-amazon-web-services-light.svg',
                website: 'https://aws.amazon.com/',
                quote: undefined,
            },
            {
                name: 'Livehire',
                logoUrlDarkMode: '/images/sponsors/2018-livehire-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-livehire-light.png',
                website: 'https://www.livehire.com/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2018-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2018-microsoft-light.png',
                website: 'https://www.microsoft.com/',
                quote: undefined,
            },
        ],
    },
}
