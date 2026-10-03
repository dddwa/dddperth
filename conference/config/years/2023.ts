import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'

import { optusStadiumVenue } from '../venues/optus-stadium.ts'

export const conference2023: ConferenceYear = {
    kind: 'conference',
    year: '2023',
    conferenceDate: DateTime.fromISO('2023-10-07'),
    venue: optusStadiumVenue,
    sessionizeUrl: 'https://sessionize.com/ddd-perth-2023',

    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: 'https://sessionize.com/api/v2/54hwhbiw',
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },
    recordings: {
        '530801': 'VIY-IyzelU8', // The Visible Developer: Why You Shouldn't Blend In
        '507975': '-f-pYAFFep8', // To Agile or Not to Agile: An Iterative Dilemma
        '497057': 'ugNvN9ny-Io', // Demystifying Performance
        '507977': 'Gk87PWaVrRE', // Stop writing fragile tests: Use SOLID Principles
        '494876': 'bXJdZ3IIINU', // Journey of an Identity
        '494314': 'ugm_Xo2Looc', // Falling off the Edge: Practical Uses for Edge Computing
        '503672': 'Po8Nc4K17xA', // Investing in your Engineering Experience
        '496926': '7r5eeBvT5gw', // The Schrodinger's paradox and metrics … does our curiosity kill the cat?
        '501705': 'bx1OFD8oP-U', // The Problem with Problem Solving
        '507918': 'jRNf-KDw8f8', // Less Boring Tests - An Introduction to Property-Based Testing
        '505719': '_NyyA4Z0wSE', // Procedural Art with a Hacked IKEA Lamp
        '501197': 'yP2Ry5Emxks', // Problem finding, not solving.
        '504893': 'XntXxLkcj5s', // Dungeons, Dragons, and Data Breaches: Exploring the Synergy of Security Crisis Response
        '505543': 'Hg_CoEQLlBU', // Trust but Verify: Ensuring Data Quality with CI/CD
        '501529': 'A29QGhEXDI0', // The Stories We Don't Tell
        '507492': 'ghUGJFRBcb4', // Do you get what I mean? Building a culture of shared understanding
        '528193': 'kFFrsNHixjs', // Space Flight in 2023
        '494475': 'qA3Cp7AMQJI', // Turning Dreaming into Doing - A Life Manual for Nerds
        '503588': '6kt2vpmRpTY', // System Thinking and Event Driven Architecture
        '508126': 'd1LXcmjB2OM', // The New Dimensions of Software Testing
        '508117': 'vSKcqQc9iRU', // Advanced HTML for Good Developers
        '499846': 'vUjhFkzzK-w', // Your Code is just a Detail
        '508194': 'sX4DrL5GNsE', // SPAs: where did it all go wrong
        '494781': 'VqiCrFhP-KY', // Nerds on a plane: what we can learn from the aviation industry
        '508110': 'rUCAE_-4c40', // Navigating salary reviews and promotions in a climate of redundancies.
        '505457': 'Vun2P3A_NB0', // Observability for Developers
        '508055': 'uEHat7325ac', // A SOLID takedown of OOP
    },

    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    feedbackOpenUntilDateTime: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    ticketInfo: {
        type: 'tito',
        accountId: 'dddperth',
        eventId: '2023',
    },

    sponsors: {
        platinum: [
            {
                name: 'Bankwest',
                logoUrlDarkMode: '/images/sponsors/2023-bankwest-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-bankwest-light.png',
                website: 'https://www.bankwest.com.au/',
                quote: undefined,
            },
            {
                name: 'Microsoft',
                logoUrlDarkMode: '/images/sponsors/2023-microsoft-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-microsoft-light.png',
                website: 'https://www.microsoft.com/',
                quote: undefined,
            },
            {
                name: 'Woodside',
                logoUrlDarkMode: '/images/sponsors/2023-woodside-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-woodside-light.png',
                website: 'https://www.woodside.com/',
                quote: undefined,
            },
        ],
        gold: [
            {
                name: 'Insight',
                logoUrlDarkMode: '/images/sponsors/2023-insight-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-insight-light.png',
                website: 'https://au.insight.com/',
                quote: undefined,
            },
            {
                name: 'Virtual Gaming Worlds',
                logoUrlDarkMode: '/images/sponsors/2023-virtual-gaming-worlds-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-virtual-gaming-worlds-light.png',
                website: 'https://www.vgw.co/',
                quote: undefined,
            },
            {
                name: 'Versent',
                logoUrlDarkMode: '/images/sponsors/2023-versent-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-versent-light.png',
                website: 'https://versent.com.au/',
                quote: undefined,
            },
            {
                name: 'Qoria',
                logoUrlDarkMode: '/images/sponsors/2023-qoria-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-qoria-light.png',
                website: 'https://qoria.com/',
                quote: undefined,
            },
            {
                name: 'GitHub',
                logoUrlDarkMode: '/images/sponsors/2023-github-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-github-light.png',
                website: 'https://github.com/',
                quote: undefined,
            },
            {
                name: 'Mantel Group',
                logoUrlDarkMode: '/images/sponsors/2023-mantel-group-dark.svg',
                logoUrlLightMode: '/images/sponsors/2023-mantel-group-light.svg',
                website: 'https://www.mantelgroup.com.au/',
                quote: undefined,
            },
            {
                name: 'Keystart',
                logoUrlDarkMode: '/images/sponsors/2023-keystart-dark.png',
                logoUrlLightMode: '/images/sponsors/2023-keystart-light.png',
                website: 'https://www.keystart.com.au/',
                quote: undefined,
            },
        ],
    },
}
