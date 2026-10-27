// DevConf Example 2024 — minimal past-year skeleton.
//
// Shows a fork what a wrapped-up year looks like: dates in the past,
// feedback window closed, sponsors retained for archive browsing. Forks
// can copy this structure when they roll over to a new conference year.

import { conferenceTime } from '../dates.ts'
import type { ConferenceYear } from '@ddd/conference-config'
import { exampleConventionCentre } from '../venues/example-convention-centre.ts'

export const conference2024: ConferenceYear = {
    kind: 'conference',
    year: '2024',
    venue: exampleConventionCentre,

    sessionizeUrl: 'https://sessionize.com/devconf-example-2024',
    sessions: {
        kind: 'sessionize',
        sessionizeEndpoint: undefined,
        allSessionsEndpoint: undefined,
        underrepresentedGroupsQuestionId: undefined,
    },

    get conferenceDate() {
        return conferenceTime('2024-10-19T09:00:00')
    },
    get agendaPublishedDateTime() {
        return conferenceTime('2024-09-15T00:00:00')
    },
    cfpDates: {
        get opens() {
            return conferenceTime('2024-06-01T00:00:00')
        },
        get closes() {
            return conferenceTime('2024-07-15T23:59:59')
        },
    },
    talkVotingDates: undefined,
    ticketReleases: [
        {
            releaseName: 'General',
            price: '$70',
            range: {
                get opens() {
                    return conferenceTime('2024-06-01T00:00:00')
                },
                get closes() {
                    return conferenceTime('2024-10-18T23:59:59')
                },
            },
        },
    ],
    get feedbackOpenUntilDateTime() {
        return conferenceTime('2024-10-26T23:59:59')
    },

    ticketInfo: {
        type: 'tito',
        accountId: 'devconf-example',
        eventId: '2024',
    },

    sponsors: {
        platinum: [
            {
                name: 'DDD Perth',
                website: 'https://dddperth.com/',
                logoUrlDarkMode: '/images/sponsors/devconf-ddd-perth-dark.png',
                logoUrlLightMode: '/images/sponsors/devconf-ddd-perth-light.png',
            },
        ],
        gold: [
            {
                name: 'Acme Corp',
                website: 'https://example.test/acme',
                logoUrlDarkMode: '/images/sponsors/devconf-acme-dark.svg',
                logoUrlLightMode: '/images/sponsors/devconf-acme-light.svg',
            },
        ],
    },
}
