// DevConf Example 2026 — announced-but-future skeleton.
//
// Shows the "save the date" shape: conference date set, but sponsors,
// agenda, CFP, and tickets are all undefined or empty. Forks can copy
// this when they kick off planning for a new year.

import { DateTime } from 'luxon'
import type { ConferenceYear } from '@ddd/conference-config'
import { exampleConventionCentre } from '../venues/example-convention-centre'

export const conference2026: ConferenceYear = {
    kind: 'conference',
    year: '2026',
    venue: exampleConventionCentre,

    sessionizeUrl: undefined,
    sessions: undefined,

    conferenceDate: DateTime.fromISO('2026-10-17T09:00:00', { zone: 'Etc/UTC' }),
    agendaPublishedDateTime: undefined,
    cfpDates: undefined,
    talkVotingDates: undefined,
    ticketReleases: [],
    feedbackOpenUntilDateTime: undefined,
    ticketInfo: undefined,
    // Set to a Sharecast instance URL (e.g. https://myconf-2026.sharecast.io/) to enable the /share page
    sharecastUrl: undefined,

    sponsors: {},
}
